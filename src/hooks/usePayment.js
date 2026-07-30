import { useState, useCallback } from 'react';
import { createPaymentIntent, confirmPayment } from '../services/RenderService';
import { PAYMENT_STATUS } from '../constants/renderConstants';

export function usePayment() {
  const [method, setMethod] = useState(null);
  const [status, setStatus] = useState(PAYMENT_STATUS.UNPAID);
  const [paymentId, setPaymentId] = useState(null);
  const [transferContent, setTransferContent] = useState(null);
  const [error, setError] = useState(null);

  const pay = useCallback(async (amountVnd) => {
    setStatus(PAYMENT_STATUS.PROCESSING);
    setError(null);
    try {
      const intent = await createPaymentIntent({ amountVnd, method });
      setPaymentId(intent.paymentId);
      setTransferContent(intent.transferContent ?? null);
      // Với Backend thật: đợi webhook ngân hàng xác nhận (có thể mất
      // vài phút) — xem RenderService.confirmPayment(), hàm này giờ
      // poll trạng thái thay vì tự đặt PAID. Mock: xác nhận ngay như cũ.
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
    setTransferContent(null);
    setError(null);
  }, []);

  return { method, setMethod, status, paymentId, transferContent, error, pay, reset };
}
