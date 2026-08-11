import { ArrowLeft, FileBox, Loader2, XOctagon, Ban } from 'lucide-react';
import StepCard from '../components/StepCard';
import { formatRelativeTime, formatDuration } from '../utils/timeUtils';
import { JOB_STATUS, JOB_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../constants/renderConstants';
import './HistoryScreen.css';

function getStatusStyle(status) {
  if (status === JOB_STATUS.FINISHED) return { bg: '#E3F7ED', color: '#2AB673', icon: FileBox };
  if (status === JOB_STATUS.ERROR) return { bg: '#FDECEC', color: '#E5484D', icon: XOctagon };
  if (status === JOB_STATUS.CANCELLED) return { bg: '#F0F0F1', color: '#6B6B70', icon: Ban };
  return { bg: '#EEF0FF', color: '#3B5BFF', icon: Loader2 };
}

export default function HistoryScreen({ jobs, isLoading, onBack, onOpenJob }) {
  return (
    <StepCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ padding: 6 }} type="button" aria-label="Quay lại">
          <ArrowLeft size={20} strokeWidth={2} color="#1C1C1E" />
        </button>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600 }}>
          Lịch sử render
        </h2>
      </div>

      {isLoading && <div className="history-empty">Đang tải...</div>}

      {!isLoading && jobs.length === 0 && (
        <div className="history-empty"><p>Chưa có job nào</p></div>
      )}

      {!isLoading && jobs.length > 0 && (
        <div>
          {jobs.map((job) => {
            const style = getStatusStyle(job.status);
            const StatusIcon = style.icon;
            return (
              <button key={job.id} className="history-item" onClick={() => onOpenJob(job)} type="button">
                <div className="history-item__icon" style={{ background: style.bg, color: style.color }}>
                  <StatusIcon size={18} strokeWidth={1.75} />
                </div>
                <div className="history-item__info">
                  <p className="history-item__name">{job.projectName}</p>
                  <p className="history-item__meta">
                    {formatRelativeTime(job.createdAt)}
                    {job.durationSec != null ? ` · ${formatDuration(job.durationSec)}` : ''}
                  </p>
                  <p className="history-item__meta" style={{ marginTop: 1 }}>
                    {PAYMENT_STATUS_LABEL[job.paymentStatus]}
                  </p>
                </div>
                <span className="history-item__badge" style={{ background: style.bg, color: style.color }}>
                  {JOB_STATUS_LABEL[job.status]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </StepCard>
  );
}
