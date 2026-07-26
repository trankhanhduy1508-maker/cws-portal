import { AlertTriangle, RotateCcw, Ban } from 'lucide-react';
import StepCard from '../components/StepCard';
import Button from '../components/Button';

/**
 * Dùng chung cho cả 2 trường hợp: lỗi hệ thống (variant="error") và
 * người dùng tự hủy job (variant="cancelled") — tránh viết trùng 1
 * layout gần giống hệt nhau 2 lần.
 */
export default function ErrorScreen({ variant = 'error', errorMessage, onRetry }) {
  const isCancelled = variant === 'cancelled';
  const Icon = isCancelled ? Ban : AlertTriangle;
  const iconBg = isCancelled ? '#F0F0F1' : '#FDECEC';
  const iconColor = isCancelled ? '#6B6B70' : '#E5484D';
  const title = isCancelled ? 'Đã hủy render' : 'Có lỗi xảy ra';
  const defaultMessage = isCancelled
    ? 'Bạn đã hủy quá trình render này.'
    : 'Không thể xử lý file của bạn. Vui lòng thử lại.';

  return (
    <StepCard>
      <div
        style={{
          width: 56, height: 56, borderRadius: 999,
          background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto',
        }}
      >
        <Icon size={28} strokeWidth={1.75} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 6 }}>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70', lineHeight: 1.5 }}>
          {errorMessage || defaultMessage}
        </p>
      </div>

      <Button icon={RotateCcw} onClick={onRetry}>
        {isCancelled ? 'Gửi file khác' : 'Thử lại'}
      </Button>
    </StepCard>
  );
}
