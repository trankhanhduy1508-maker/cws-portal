import { PaymentMethod } from '../payment.types';

export interface ManualPaymentInstructionsProvider {
  readonly method: PaymentMethod;
  buildInstructions(input: {
    expectedAmountVnd: number;
    paymentReference: string;
    expiresAt: number;
  }): { recipient: string; accountLabel: string; vietQrUrl: string | null };
}

// Manual providers only create instructions. They never confirm money movement.
