import {
  PaymentMethod,
  PaymentStatus,
  PAYMENT_OUTPUT_ELIGIBLE_STATUSES,
  VIETNAM_MVP_PAYMENT_METHODS,
} from './payment.types';

describe('Vietnam MVP payment methods', () => {
  it('exposes only MB bank transfer and manual MoMo', () => {
    expect(VIETNAM_MVP_PAYMENT_METHODS).toEqual([
      PaymentMethod.MB_BANK_TRANSFER,
      PaymentMethod.MOMO_MANUAL,
    ]);
  });

  it('does not expose Stripe or PayPal', () => {
    expect(VIETNAM_MVP_PAYMENT_METHODS).not.toContain('stripe' as PaymentMethod);
    expect(VIETNAM_MVP_PAYMENT_METHODS).not.toContain('paypal' as PaymentMethod);
  });
});

describe('payment output eligibility contract', () => {
  it('allows only confirmed or already-unlocked payments', () => {
    expect(PAYMENT_OUTPUT_ELIGIBLE_STATUSES).toEqual([
      PaymentStatus.CONFIRMED,
      PaymentStatus.ORIGINAL_UNLOCKED,
    ]);
  });

  it('fails closed for rejected and refunded payments', () => {
    expect(PAYMENT_OUTPUT_ELIGIBLE_STATUSES).not.toContain(PaymentStatus.REJECTED);
    expect(PAYMENT_OUTPUT_ELIGIBLE_STATUSES).not.toContain(PaymentStatus.REFUNDED);
  });
});
