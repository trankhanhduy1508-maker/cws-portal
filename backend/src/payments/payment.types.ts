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
