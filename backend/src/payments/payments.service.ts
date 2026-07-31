import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentsRepository } from './payments.repository';
import { QrBankProvider } from './providers/qr-bank.provider';
import { IPaymentProvider } from './providers/payment-provider.interface';
import { PaymentMethod, PaymentRecord, PaymentStatus } from './payment.types';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';
import { MbbankNotificationDto } from './dto/mbbank-notification.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Partial<Record<PaymentMethod, IPaymentProvider>>;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    qrBankProvider: QrBankProvider,
  ) {
    // MVP chỉ dùng MB Bank QR (CWS_ROADMAP_MVP_V1.md, Giai đoạn 5).
    // Wallet/Stripe/PayPal không thuộc MVP — đã gỡ khỏi registry.
    this.providers = {
      [PaymentMethod.QR_BANK]: qrBankProvider,
    };
  }

  /**
   * `jobContext` gắn payment với 1 job cụ thể (JobsService.approve() —
   * CWS_MVP_WORKFLOW_FINAL.md: QR chỉ sinh SAU khi khách duyệt preview)
   * để transferContent chứa storage_code và webhook đối chiếu được cả
   * 2 mã. Không bắt buộc — POST /payments gọi trực tiếp (không qua job)
   * vẫn hoạt động, chỉ không có storage_code trong nội dung chuyển khoản.
   */
  async createIntent(
    dto: CreatePaymentDto,
    jobContext?: { jobId: string; storageCode: string },
  ): Promise<{
    paymentId: string;
    status: PaymentStatus;
    paymentCode: string | null;
    transferContent: string | null;
    amountVnd: number;
    qrImageUrl: string | null;
  }> {
    const provider = this.providers[dto.method];
    if (!provider) {
      throw new BadRequestException(
        `Phương thức thanh toán "${dto.method}" chưa được hỗ trợ ở Backend (chỉ qr_bank khả dụng trong MVP)`,
      );
    }

    const { providerRef, status, paymentCode, transferContent, qrImageUrl, bankName, accountNumber } =
      await provider.createIntent(dto.amountVnd, jobContext?.storageCode ?? null);
    const paymentId = randomUUID();

    const record: PaymentRecord = {
      paymentId,
      amountVnd: dto.amountVnd,
      method: dto.method,
      status,
      createdAt: Date.now(),
      confirmedAt: null,
      paymentCode,
      transferContent,
      jobId: jobContext?.jobId ?? null,
      storageCode: jobContext?.storageCode ?? null,
      bankName,
      accountNumber,
      qrImageUrl,
    };
    await this.paymentsRepository.create(record);

    // Lưu providerRef vào paymentId để confirm() sau tìm lại đúng provider —
    // đơn giản hoá: dùng chính paymentId làm khóa tra cứu, providerRef giữ
    // nội bộ provider (qr-*) đủ để suy luận lại provider nào xử lý.
    void providerRef;
    return { paymentId, status, paymentCode, transferContent, amountVnd: dto.amountVnd, qrImageUrl };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const record = await this.paymentsRepository.findById(paymentId);
    if (!record) throw new NotFoundException(`Không tìm thấy payment ${paymentId}`);
    return record.status;
  }

  /** Chi tiết đầy đủ cho Portal hiển thị lại QR/nội dung chuyển khoản
   * (vd khách tải lại trang lúc đang chờ thanh toán) — không chỉ status. */
  async getPublicDetails(paymentId: string): Promise<{
    paymentId: string;
    status: PaymentStatus;
    paymentCode: string | null;
    transferContent: string | null;
    amountVnd: number;
    qrImageUrl: string | null;
  }> {
    const record = await this.paymentsRepository.findById(paymentId);
    if (!record) throw new NotFoundException(`Không tìm thấy payment ${paymentId}`);
    return {
      paymentId: record.paymentId,
      status: record.status,
      paymentCode: record.paymentCode,
      transferContent: record.transferContent,
      amountVnd: record.amountVnd,
      qrImageUrl: record.qrImageUrl,
    };
  }

  /** Admin tra cứu theo Payment Code (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  async getByPaymentCode(paymentCode: string): Promise<PaymentRecord> {
    const record = await this.paymentsRepository.findByPaymentCode(paymentCode.toUpperCase());
    if (!record) throw new NotFoundException(`Không tìm thấy payment với mã ${paymentCode}`);
    return record;
  }

  async confirm(paymentId: string): Promise<{ paymentId: string; status: PaymentStatus }> {
    const record = await this.paymentsRepository.findById(paymentId);
    if (!record) throw new NotFoundException(`Không tìm thấy payment ${paymentId}`);

    const provider = this.providers[record.method];
    if (!provider) {
      throw new BadRequestException(`Phương thức thanh toán "${record.method}" chưa được hỗ trợ`);
    }

    const { status } = await provider.confirm(paymentId);
    await this.paymentsRepository.updateStatus(paymentId, status);
    return { paymentId, status };
  }

  /**
   * Webhook ngân hàng báo giao dịch thành công (CWS_MVP_WORKFLOW_FINAL.md,
   * mục Webhook): kiểm tra số tiền + nội dung + payment_code + storage_code,
   * CHỈ khi khớp mới set PAID. Đây là đường DUY NHẤT hợp lệ để đặt PAID
   * cho qr_bank — không có endpoint nào khác cho phép client tự đặt PAID.
   *
   * Định dạng bắt buộc: "CWS {storage_code} {payment_code}" — payment
   * nào không gắn job (jobContext rỗng lúc tạo, chỉ xảy ra khi gọi thẳng
   * POST /payments không qua JobsService.approve()) sẽ không có
   * storage_code để đối chiếu, webhook cho payment đó luôn bị từ chối
   * (không phải luồng thật của MVP nên chấp nhận giới hạn này).
   */
  async confirmViaWebhook(dto: WebhookPaymentDto): Promise<{ paymentId: string; status: PaymentStatus }> {
    return this.matchAndConfirm(dto.transferContent, dto.amountVnd);
  }

  /**
   * Logic đối chiếu + đặt PAID DÙNG CHUNG cho mọi nguồn báo thanh toán
   * (webhook ngân hàng/cổng trung gian THẬT, hoặc app Android đọc thông
   * báo MBBank — xem confirmViaMbbankNotification()) — CHỈ 1 nơi duy
   * nhất được phép set PAID, tránh 2 luồng đối chiếu lệch nhau.
   */
  private async matchAndConfirm(
    transferContent: string,
    amountVnd: number,
  ): Promise<{ paymentId: string; status: PaymentStatus }> {
    const match = transferContent.match(/CWS\s+(\S+)\s+([A-Za-z0-9]+)/);
    if (!match) {
      throw new BadRequestException(
        `Nội dung chuyển khoản không đúng định dạng "CWS {storage_code} {payment_code}": "${transferContent}"`,
      );
    }
    const [, storageCodeRaw, paymentCodeRaw] = match;
    const paymentCode = paymentCodeRaw.toUpperCase();
    const storageCode = storageCodeRaw.toUpperCase();

    const record = await this.paymentsRepository.findByPaymentCode(paymentCode);
    if (!record) {
      throw new NotFoundException(`Không tìm thấy payment với mã ${paymentCode}`);
    }
    if (record.status === PaymentStatus.PAID) {
      return { paymentId: record.paymentId, status: record.status }; // đã xử lý trước đó, tránh double-confirm
    }
    if (!record.storageCode || record.storageCode.toUpperCase() !== storageCode) {
      throw new BadRequestException(
        `Storage code không khớp cho payment ${record.paymentId}: kỳ vọng ${record.storageCode ?? '(không có)'}, nhận ${storageCode}`,
      );
    }
    if (record.amountVnd !== amountVnd) {
      throw new BadRequestException(
        `Số tiền không khớp cho payment ${record.paymentId}: kỳ vọng ${record.amountVnd}, nhận ${amountVnd}`,
      );
    }

    const updated = await this.paymentsRepository.updateStatus(record.paymentId, PaymentStatus.PAID);
    if (!updated) throw new NotFoundException(`Không tìm thấy payment ${record.paymentId}`);
    return { paymentId: updated.paymentId, status: updated.status };
  }

  /**
   * App Android Notification Listener báo về sau khi đọc được thông báo
   * biến động số dư MBBank thật trên điện thoại (xem NotificationSecretGuard
   * + reports/payments/MBBANK_NOTIFICATION_LISTENER_RESEARCH.md). Điện
   * thoại CHỈ đưa tin — hàm này (Backend) mới là nơi quyết định thanh
   * toán thành công, dùng LẠI đúng logic đối chiếu của confirmViaWebhook
   * (matchAndConfirm), không tạo đường tắt riêng.
   *
   * Chống trùng/replay: ghi payment_notifications NGAY LẬP TỨC với
   * transaction_id UNIQUE (migration 014) TRƯỚC khi xử lý — insert thất
   * bại vì trùng nghĩa là request này đã xử lý trước đó (hoặc đang xử lý
   * đồng thời), trả lại đúng kết quả cũ (idempotent), KHÔNG xử lý lại,
   * KHÔNG coi là lỗi (điện thoại có thể gửi lại do mất mạng/retry).
   * Notification không hợp lệ (sai định dạng/sai số tiền/không tìm thấy
   * payment...) -> ghi rejected + lý do vào payment_notifications
   * (audit log), KHÔNG mở khoá gì, ném lỗi lại cho caller.
   */
  async confirmViaMbbankNotification(
    dto: MbbankNotificationDto,
  ): Promise<{ paymentId: string | null; status: PaymentStatus | null; duplicate: boolean }> {
    const inserted = await this.paymentsRepository.insertNotificationProcessing(dto);

    if (!inserted) {
      const existing = await this.paymentsRepository.findNotificationByTransactionId(
        dto.transaction_id,
      );
      if (!existing) {
        throw new BadRequestException(
          `transaction_id ${dto.transaction_id} bị trùng nhưng không đọc lại được — thử lại sau`,
        );
      }
      if (existing.status === 'rejected') {
        throw new BadRequestException(
          existing.reject_reason ?? `transaction_id ${dto.transaction_id} đã bị từ chối trước đó`,
        );
      }
      const payment = existing.payment_id
        ? await this.paymentsRepository.findById(existing.payment_id)
        : null;
      this.logger.warn(
        `confirmViaMbbankNotification: transaction_id ${dto.transaction_id} đã xử lý trước đó — trả lại kết quả cũ (replay/retry)`,
      );
      return { paymentId: existing.payment_id, status: payment?.status ?? null, duplicate: true };
    }

    try {
      const result = await this.matchAndConfirm(dto.transfer_content, dto.amount);
      await this.paymentsRepository.markNotificationOutcome(inserted.id, {
        status: 'processed',
        paymentId: result.paymentId,
      });
      return { ...result, duplicate: false };
    } catch (err) {
      await this.paymentsRepository.markNotificationOutcome(inserted.id, {
        status: 'rejected',
        rejectReason: (err as Error).message,
      });
      throw err;
    }
  }
}
