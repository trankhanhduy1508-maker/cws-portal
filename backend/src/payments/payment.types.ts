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
}
