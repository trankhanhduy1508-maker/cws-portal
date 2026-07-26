import { useState } from 'react';
import { XCircle } from 'lucide-react';
import StepCard from '../components/StepCard';
import StepDots from '../components/StepDots';
import RenderProgress from '../components/RenderProgress';
import CancelConfirmModal from '../components/CancelConfirmModal';
import { formatEtaDuration, formatEtaClockTime } from '../utils/timeUtils';

export default function ProgressScreen({ stageIndex, overallProgress, fileName, etaSeconds, onCancel }) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Ước tính thời gian còn lại dựa trên % đã hoàn thành so với ETA ban đầu.
  // Đây là suy diễn ở FE (ETA gốc x phần trăm còn lại) — khi có Backend
  // thật, nên thay bằng ETA cập nhật động do Backend tính lại theo tiến
  // độ thực tế của Worker, chính xác hơn suy diễn tuyến tính đơn giản này.
  const remainingSeconds = etaSeconds != null
    ? Math.max(0, Math.round(etaSeconds * (1 - overallProgress / 100)))
    : null;

  return (
    <StepCard>
      <StepDots total={5} current={2} />

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Đang xử lý
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>
          {fileName}
        </p>
      </div>

      <RenderProgress stageIndex={stageIndex} overallProgress={overallProgress} />

      {remainingSeconds != null && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
            {formatEtaDuration(remainingSeconds)}
          </p>
          <p style={{ fontSize: 13, color: '#B0B0B5', marginTop: 2 }}>
            {formatEtaClockTime(remainingSeconds)}
          </p>
        </div>
      )}

      <p style={{ fontSize: 13, color: '#B0B0B5', textAlign: 'center' }}>
        Bạn có thể đóng trang này — chúng tôi sẽ tiếp tục xử lý
      </p>

      <button
        onClick={() => setIsCancelModalOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 14, color: '#E5484D', fontWeight: 600, padding: 10,
        }}
        type="button"
      >
        <XCircle size={16} strokeWidth={2} />
        Hủy Render
      </button>

      {isCancelModalOpen && (
        <CancelConfirmModal
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={() => { setIsCancelModalOpen(false); onCancel(); }}
        />
      )}
    </StepCard>
  );
}
