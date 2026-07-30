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

  async createIntent(
    dto: CreatePaymentDto,
  ): Promise<{ paymentId: string; status: PaymentStatus; transferContent: string | null; amountVnd: number }> {
    const provider = this.providers[dto.method];
    if (!provider) {
      throw new BadRequestException(
        `Phương thức thanh toán "${dto.method}" chưa được hỗ trợ ở Backend (chỉ qr_bank khả dụng trong MVP)`,
      );
    }

    const { providerRef, status, paymentCode, transferContent } = await provider.createIntent(dto.amountVnd);
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
    };
    await this.paymentsRepository.create(record);

    // Lưu providerRef vào paymentId để confirm() sau tìm lại đúng provider —
    // đơn giản hoá: dùng chính paymentId làm khóa tra cứu, providerRef giữ
    // nội bộ provider (qr-*) đủ để suy luận lại provider nào xử lý.
    void providerRef;
    return { paymentId, status, transferContent, amountVnd: dto.amountVnd };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const record = await this.paymentsRepository.findById(paymentId);
    if (!record) throw new NotFoundException(`Không tìm thấy payment ${paymentId}`);
    return record.status;
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
   * mục Webhook): kiểm tra số tiền + nội dung + payment_code, CHỈ khi
   * khớp mới set PAID. Đây là đường DUY NHẤT hợp lệ để đặt PAID cho
   * qr_bank — không có endpoint nào khác cho phép client tự đặt PAID.
   */
  async confirmViaWebhook(dto: WebhookPaymentDto): Promise<{ paymentId: string; status: PaymentStatus }> {
    const match = dto.transferContent.match(/CWS\s+([A-Z0-9]+)/i);
    if (!match) {
      throw new BadRequestException(
        `Nội dung chuyển khoản không đúng định dạng "CWS {payment_code}": "${dto.transferContent}"`,
      );
    }
    const paymentCode = match[1].toUpperCase();

    const record = await this.paymentsRepository.findByPaymentCode(paymentCode);
    if (!record) {
      throw new NotFoundException(`Không tìm thấy payment với mã ${paymentCode}`);
    }
    if (record.status === PaymentStatus.PAID) {
      return { paymentId: record.paymentId, status: record.status }; // đã xử lý trước đó, tránh double-confirm
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
