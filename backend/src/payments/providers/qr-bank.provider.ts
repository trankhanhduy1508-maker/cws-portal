import { Injectable } from '@nestjs/common';
import { IPaymentProvider } from './payment-provider.interface';
import { PaymentStatus } from '../payment.types';

/**
 * GIỚI HẠN THẬT (ghi rõ, không giả vờ): chưa nối cổng QR ngân hàng
 * thật (VNPay/Momo/ZaloPay...). Provider này mô phỏng độ trễ như đang
 * chờ khách quét mã xong, rồi tự xác nhận PAID — KHÔNG có giao dịch
 * tiền thật nào xảy ra. Khi nối cổng thật: hàm createIntent() nên trả
 * về QR code thật (ảnh/URL) thay vì chỉ 1 providerRef giả, và confirm()
 * nên là webhook nhận từ cổng thanh toán báo về, không phải setTimeout.
 */
@Injectable()
export class QrBankProvider implements IPaymentProvider {
  async createIntent(
    _amountVnd: number,
  ): Promise<{ providerRef: string; status: PaymentStatus }> {
    return { providerRef: `qr-${Date.now()}`, status: PaymentStatus.PROCESSING };
  }

  async confirm(providerRef: string): Promise<{ status: PaymentStatus }> {
    void providerRef;
    await new Promise((resolve) => setTimeout(resolve, 1800));
    return { status: PaymentStatus.PAID };
  }
}
