import { Injectable } from '@nestjs/common';
import { IPaymentProvider } from './payment-provider.interface';
import { PaymentStatus } from '../payment.types';

/**
 * GIỚI HẠN THẬT (ghi rõ, không giả vờ): Ví CWS hiện CHƯA có ledger/số
 * dư thật đứng sau — provider này chỉ xác nhận giao dịch ngay lập tức,
 * tương đương hành vi bản mock trước đây. Khi CWS có hệ thống ví thật
 * (nạp tiền, trừ tiền, lịch sử giao dịch), thay thế toàn bộ nội dung
 * hàm confirm() bằng lời gọi tới ledger thật — KHÔNG đổi interface.
 */
@Injectable()
export class WalletProvider implements IPaymentProvider {
  async createIntent(
    _amountVnd: number,
  ): Promise<{ providerRef: string; status: PaymentStatus }> {
    return { providerRef: `wallet-${Date.now()}`, status: PaymentStatus.PROCESSING };
  }

  async confirm(providerRef: string): Promise<{ status: PaymentStatus }> {
    void providerRef;
    return { status: PaymentStatus.PAID };
  }
}
