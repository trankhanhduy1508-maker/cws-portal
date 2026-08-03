export enum PaymentMethod {
  QR_BANK = 'qr_bank',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
}

export interface PaymentRecord {
  paymentId: string;
  amountVnd: number;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: number;
  confirmedAt: number | null;
  /** Mã tra cứu ngắn dùng trong nội dung chuyển khoản — vd "CWS AB12CD34". */
  paymentCode: string | null;
  /** Nội dung chuyển khoản đầy đủ hiển thị cho khách:
   * "CWS {storageCode} {paymentCode}" (CWS_MVP_WORKFLOW_FINAL.md, mục
   * Thanh toán) khi có gắn với 1 job, ngược lại "CWS {paymentCode}". */
  transferContent: string | null;
  /** FK job (CWS_DATABASE_SCHEMA.md, bảng payments.job_id) — null nếu
   * payment tạo độc lập không gắn job nào (không xảy ra trong luồng
   * MVP thật, chỉ có thể qua gọi thẳng POST /payments). */
  jobId: string | null;
  /** Bản sao storage_code của job tại thời điểm tạo — dùng để webhook
   * đối chiếu (CWS_MVP_WORKFLOW_FINAL.md: "Kiểm tra storage_code") mà
   * không cần PaymentsModule phụ thuộc ngược vào JobsModule. */
  storageCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  /** Ảnh QR (VietQR) tại thời điểm tạo — lưu lại để trả về nguyên vẹn
   * khi khách tải lại trang, không cần tính lại. */
  qrImageUrl: string | null;
}

/** 1 dòng bất thường thanh toán/refund (payment/refund safety net,
 * xem worker_migrations/015_payment_reconciliation_view.sql). Đọc từ
 * view CHỈ ĐỌC `payment_reconciliation_anomalies` — 3 loại:
 * PAID_WITHOUT_PAYMENT_RECORD, NOTIFICATION_STUCK_PROCESSING,
 * PAID_NOT_DELIVERED (chi tiết từng loại xem comment trong migration). */
export interface PaymentReconciliationAnomaly {
  anomalyType: 'PAID_WITHOUT_PAYMENT_RECORD' | 'NOTIFICATION_STUCK_PROCESSING' | 'PAID_NOT_DELIVERED';
  orderId: string;
  storageCode: string | null;
  orderStatus: string | null;
  paymentStatus: string | null;
  referenceTime: number;
  amountVnd: number | null;
}
