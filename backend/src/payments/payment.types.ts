export enum PaymentMethod {
  MB_BANK_TRANSFER = 'mb_bank_transfer',
  MOMO_MANUAL = 'momo_manual',
}

export enum PaymentStatus {
  AWAITING_TRANSFER = 'awaiting_transfer',
  UNDER_REVIEW = 'under_review',
  CONFIRMED = 'confirmed',
  ORIGINAL_UNLOCKED = 'original_unlocked',
  EXPIRED = 'expired',
  UNDERPAID = 'underpaid',
  OVERPAID = 'overpaid',
  REJECTED = 'rejected',
  REFUND_PENDING = 'refund_pending',
  REFUNDED = 'refunded',
}

export interface PaymentInstructions {
  recipient: string;
  accountLabel: string;
  vietQrUrl: string | null;
}

export interface PaymentRecord {
  paymentId: string;
  customerId: string;
  orderId: string | null;
  expectedAmountVnd: number;
  receivedAmountVnd: number | null;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentReference: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
  confirmedAt: number | null;
  confirmationActorId: string | null;
  operatorNote: string | null;
}
