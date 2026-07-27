import { PaymentStatus } from '../payment.types';

export const PAYMENT_PROVIDER_REGISTRY = Symbol('PAYMENT_PROVIDER_REGISTRY');

/**
 * Mỗi phương thức thanh toán (Wallet, QR ngân hàng, Stripe, PayPal...)
 * implement interface này riêng — thêm phương thức mới chỉ cần thêm 1
 * class mới, không sửa PaymentsService.
 */
export interface IPaymentProvider {
  /** Bắt đầu 1 giao dịch — trả về trạng thái ban đầu (thường PROCESSING) */
  createIntent(amountVnd: number): Promise<{ providerRef: string; status: PaymentStatus }>;
  /** Xác nhận giao dịch đã hoàn tất (khách quét QR xong, ví trừ tiền...) */
  confirm(providerRef: string): Promise<{ status: PaymentStatus }>;
}
