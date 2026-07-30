import { PaymentStatus } from '../payment.types';

export const PAYMENT_PROVIDER_REGISTRY = Symbol('PAYMENT_PROVIDER_REGISTRY');

/**
 * Mỗi phương thức thanh toán implement interface này riêng — thêm
 * phương thức mới chỉ cần thêm 1 class mới, không sửa PaymentsService.
 * MVP chỉ có QrBankProvider (MB Bank QR).
 */
export interface IPaymentProvider {
  /** Bắt đầu 1 giao dịch — trả về trạng thái ban đầu (thường PROCESSING).
   * paymentCode/transferContent chỉ có ý nghĩa với phương thức có nội
   * dung chuyển khoản tra cứu được (vd QR ngân hàng) — null nếu không áp dụng. */
  createIntent(amountVnd: number): Promise<{
    providerRef: string;
    status: PaymentStatus;
    paymentCode: string | null;
    transferContent: string | null;
    /** Ảnh QR quét được (VietQR) — null nếu chưa cấu hình tài khoản nhận tiền thật. */
    qrImageUrl: string | null;
  }>;
  /** Xác nhận giao dịch đã hoàn tất qua hành động TRỰC TIẾP của provider
   * (vd ví trừ tiền ngay) — QR ngân hàng KHÔNG implement thật vì việc
   * xác nhận phải đến từ webhook ngân hàng, không phải client tự gọi. */
  confirm(providerRef: string): Promise<{ status: PaymentStatus }>;
}
