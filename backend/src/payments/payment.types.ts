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
  /** Nội dung chuyển khoản đầy đủ hiển thị cho khách: "CWS {paymentCode}". */
  transferContent: string | null;
}
