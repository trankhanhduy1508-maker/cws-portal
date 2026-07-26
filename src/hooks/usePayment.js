import { useState, useCallback } from 'react';
import { createPaymentIntent, confirmPayment } from '../services/RenderService';
import { PAYMENT_STATUS } from '../constants/renderConstants';

export function usePayment() {
  const [method, setMethod] = useState(null);
  const [status, setStatus] = useState(PAYMENT_STATUS.UNPAID);
  const [paymentId, setPaymentId] = useState(null);
  const [error, setError] = useState(null);

  const pay = useCallback(async (amountVnd) => {
    setStatus(PAYMENT_STATUS.PROCESSING);
    setError(null);
    try {
      const intent = await createPaymentIntent({ amountVnd, method });
      setPaymentId(intent.paymentId);
      const confirmed = await confirmPayment({ paymentId: intent.paymentId, method });
      setStatus(confirmed.status);
      return confirmed.status === PAYMENT_STATUS.PAID ? intent.paymentId : null;
    } catch (err) {
      setStatus(PAYMENT_STATUS.FAILED);
      setError(err.message || 'Thanh toán thất bại');
      return null;
    }
  }, [method]);

  const reset = useCallback(() => {
    setMethod(null);
    setStatus(PAYMENT_STATUS.UNPAID);
    setPaymentId(null);
    setError(null);
  }, []);

  return { method, setMethod, status, paymentId, error, pay, reset };
}
