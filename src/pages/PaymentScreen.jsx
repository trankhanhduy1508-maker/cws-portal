import { ArrowLeft, Lock } from 'lucide-react';
import StepCard from '../components/StepCard';
import StepDots from '../components/StepDots';
import PaymentMethodPicker from '../components/PaymentMethodPicker';
import Button from '../components/Button';
import { formatPriceVnd } from '../utils/timeUtils';
import { PAYMENT_STATUS } from '../constants/renderConstants';

export default function PaymentScreen({
  amountVnd, method, setMethod, status, error,
  onPay, onBack,
}) {
  const isProcessing = status === PAYMENT_STATUS.PROCESSING;

  return (
    <StepCard>
      <StepDots total={5} current={2} />

      <div>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Thanh toán
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>
          Xác nhận trước khi bắt đầu render
        </p>
      </div>

      <div style={{ padding: '16px 18px', borderRadius: 16, background: '#EEF0FF', textAlign: 'center' }}>
        <p style={{ fontSize: 12.5, color: '#3B5BFF', fontWeight: 600, marginBottom: 4 }}>Số tiền cần thanh toán</p>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 24, fontWeight: 500, color: '#1C1C1E' }}>
          {formatPriceVnd(amountVnd)}
        </p>
      </div>

      <PaymentMethodPicker selected={method} onSelect={setMethod} />

      {status === PAYMENT_STATUS.FAILED && (
        <p style={{ fontSize: 13.5, color: '#E5484D', textAlign: 'center' }}>
          {error || 'Thanh toán thất bại, vui lòng thử lại'}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button
          icon={Lock}
          disabled={!method || isProcessing}
          onClick={onPay}
        >
          {isProcessing ? 'Đang xử lý thanh toán...' : 'Xác nhận thanh toán'}
        </Button>
        <button
          onClick={onBack}
          disabled={isProcessing}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: '#6B6B70', fontWeight: 600, padding: 8 }}
          type="button"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Quay lại
        </button>
      </div>
    </StepCard>
  );
}
