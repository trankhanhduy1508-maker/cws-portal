import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentsRepository } from './payments.repository';
import { QrBankProvider } from './providers/qr-bank.provider';
import { IPaymentProvider } from './providers/payment-provider.interface';
import { PaymentMethod, PaymentRecord, PaymentStatus } from './payment.types';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';

@Injectable()
export class PaymentsService {
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
    const match = dto.transferContent.match(/CWS\s+(\S+)\s+([A-Za-z0-9]+)/);
    if (!match) {
      throw new BadRequestException(
        `Nội dung chuyển khoản không đúng định dạng "CWS {storage_code} {payment_code}": "${dto.transferContent}"`,
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
    if (record.amountVnd !== dto.amountVnd) {
      throw new BadRequestException(
        `Số tiền không khớp cho payment ${record.paymentId}: kỳ vọng ${record.amountVnd}, nhận ${dto.amountVnd}`,
      );
    }

    const updated = await this.paymentsRepository.updateStatus(record.paymentId, PaymentStatus.PAID);
    if (!updated) throw new NotFoundException(`Không tìm thấy payment ${record.paymentId}`);
    return { paymentId: updated.paymentId, status: updated.status };
  }
}
