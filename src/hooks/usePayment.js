import { useState, useCallback } from 'react';
import { createPaymentIntent, submitPaymentEvidence } from '../services/RenderService';
import { PAYMENT_STATUS } from '../constants/renderConstants';

export function usePayment() {
  const [method, setMethod] = useState(null);
  const [status, setStatus] = useState(PAYMENT_STATUS.UNPAID);
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState(null);

  const pay = useCallback(async ({ profileId, input }) => {
    setStatus(PAYMENT_STATUS.PROCESSING);
    setError(null);
    try {
      const created = await createPaymentIntent({
        profileId,
        fileSizeBytes: input?.fileSizeBytes ?? null,
        method,
      });
      setIntent(created);
      setStatus(created.status);
      return created;
    } catch (err) {
      setStatus(PAYMENT_STATUS.FAILED);
      setError(err.message || 'Không tạo được hướng dẫn thanh toán');
      return null;
    }
  }, [method]);

  const submitEvidence = useCallback(async () => {
    if (!intent) return null;
    try {
      const updated = await submitPaymentEvidence({
        paymentId: intent.paymentId,
        claimedAmountVnd: intent.expectedAmountVnd,
      });
      setIntent((current) => ({ ...current, ...updated }));
      setStatus(updated.status);
      return updated;
    } catch (err) {
      setError(err.message || 'Không gửi được xác nhận chuyển khoản');
      return null;
    }
  }, [intent]);

  const reset = useCallback(() => {
    setMethod(null); setStatus(PAYMENT_STATUS.UNPAID); setIntent(null); setError(null);
  }, []);

  return { method, setMethod, status, paymentId: intent?.paymentId ?? null, intent, error, pay, submitEvidence, reset };
}
