import { PlayCircle, Clock3 } from 'lucide-react';
import StepCard from '../components/StepCard';
import StepDots from '../components/StepDots';
import Button from '../components/Button';
import { formatBytes } from '../utils/fileUtils';
import { formatEtaDuration, formatPriceVnd } from '../utils/timeUtils';
import { RENDER_SPEEDS, FILE_SOURCE } from '../constants/renderConstants';
import './JobConfirmScreen.css';

export default function JobConfirmScreen({
  source, file, driveLink, resolvedInfo, speed,
  estimate, queueStatus, isLoadingEstimate,
  onConfirm, onBack,
}) {
  const speedInfo = RENDER_SPEEDS.find((s) => s.id === speed);
  const displayName = source === FILE_SOURCE.UPLOAD
    ? file?.name
    : (resolvedInfo?.fileName || driveLink);
  const displaySize = source === FILE_SOURCE.UPLOAD
    ? formatBytes(file?.size ?? 0)
    : (resolvedInfo?.fileSizeBytes ? formatBytes(resolvedInfo.fileSizeBytes) : 'Chưa xác định');

  return (
    <StepCard>
      <StepDots total={5} current={1} />

      <div>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Xác nhận thông tin
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>
          Kiểm tra lại trước khi bắt đầu render
        </p>
      </div>

      <div>
        <div className="confirm-row">
          <span className="confirm-row__label">Tên file</span>
          <span className="confirm-row__value">{displayName}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-row__label">Dung lượng</span>
          <span className="confirm-row__value">{displaySize}</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-row__label">Loại file</span>
          <span className="confirm-row__value">Blender (.blend)</span>
        </div>
        <div className="confirm-row">
          <span className="confirm-row__label">Chế độ render</span>
          <span className="confirm-row__value">{speedInfo?.label}</span>
        </div>
      </div>

      {isLoadingEstimate ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#B0B0B5', fontSize: 14 }}>
          Đang tính toán...
        </div>
      ) : (
        <>
          <div className="confirm-highlight">
            <span className="confirm-highlight__label">Thời gian dự kiến</span>
            <span className="confirm-highlight__value">{formatEtaDuration(estimate?.etaSeconds)}</span>
          </div>
          <div className="confirm-highlight">
            <span className="confirm-highlight__label">Giá dự kiến</span>
            <span className="confirm-highlight__value">{formatPriceVnd(estimate?.priceVnd)}</span>
          </div>

          {queueStatus?.workersAhead > 0 && (
            <div className="confirm-queue-note">
              <Clock3 size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span>
                Đang có {queueStatus.workersAhead} việc xử lý trước —{' '}
                {formatEtaDuration(queueStatus.etaStartSeconds)} nữa sẽ bắt đầu
              </span>
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button icon={PlayCircle} onClick={onConfirm} disabled={isLoadingEstimate}>
          Bắt đầu Render
        </Button>
        <button
          onClick={onBack}
          style={{ fontSize: 14, color: '#6B6B70', fontWeight: 600, padding: 8 }}
          type="button"
        >
          Quay lại
        </button>
      </div>
    </StepCard>
  );
}
