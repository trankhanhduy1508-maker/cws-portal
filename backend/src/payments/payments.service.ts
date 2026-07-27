import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentsRepository } from './payments.repository';
import { WalletProvider } from './providers/wallet.provider';
import { QrBankProvider } from './providers/qr-bank.provider';
import { IPaymentProvider } from './providers/payment-provider.interface';
import { PaymentMethod, PaymentRecord, PaymentStatus } from './payment.types';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly providers: Partial<Record<PaymentMethod, IPaymentProvider>>;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    walletProvider: WalletProvider,
    qrBankProvider: QrBankProvider,
  ) {
    // Stripe/PayPal CHƯA có provider thật (Portal cũng đã disable 2
    // phương thức này ở PaymentMethodPicker — xem PAYMENT_METHODS
    // trong renderConstants.js, available: false). Nếu Backend nhận
    // được request với method này (vd gọi API trực tiếp bỏ qua Portal),
    // trả lỗi rõ ràng thay vì giả vờ xử lý được.
    this.providers = {
      [PaymentMethod.WALLET]: walletProvider,
      [PaymentMethod.QR_BANK]: qrBankProvider,
    };
  }

  async createIntent(dto: CreatePaymentDto): Promise<{ paymentId: string; status: PaymentStatus }> {
    const provider = this.providers[dto.method];
    if (!provider) {
      throw new BadRequestException(
        `Phương thức thanh toán "${dto.method}" chưa được hỗ trợ ở Backend (chỉ wallet/qr_bank khả dụng hiện tại)`,
      );
    }

    const { providerRef, status } = await provider.createIntent(dto.amountVnd);
    const paymentId = randomUUID();

    const record: PaymentRecord = {
      paymentId,
      amountVnd: dto.amountVnd,
      method: dto.method,
      status,
      createdAt: Date.now(),
      confirmedAt: null,
    };
    await this.paymentsRepository.create(record);

    // Lưu providerRef vào paymentId để confirm() sau tìm lại đúng provider —
    // đơn giản hoá: dùng chính paymentId làm khóa tra cứu, providerRef giữ
    // nội bộ provider (wallet-*/qr-*) đủ để suy luận lại provider nào xử lý.
    void providerRef;
    return { paymentId, status };
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
}
