import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Eye } from 'lucide-react';
import StepCard from '../components/StepCard';
import StepDots from '../components/StepDots';
import Button from '../components/Button';
import { getJobPreview } from '../services/RenderService';

/** Khách xem 3-5 ảnh preview (đã watermark "CWS RENDER") và bấm duyệt
 * trước khi Backend đóng gói + mở link tải file gốc (CWS_ROADMAP_MVP_V1.md,
 * Giai đoạn 4 — "Khách chỉ xem preview, chưa được tải file gốc"). */
export default function ReviewScreen({ jobId, fileName, onApprove }) {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getJobPreview(jobId)
      .then((res) => { if (!cancelled) setImages(res.images ?? []); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Không tải được ảnh xem trước'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [jobId]);

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    setApproveError(null);
    try {
      await onApprove();
    } catch (err) {
      setApproveError(err.message || 'Duyệt kết quả thất bại');
      setIsApproving(false);
    }
  }, [onApprove]);

  return (
    <StepCard>
      <StepDots total={5} current={4} />

      <div style={{ textAlign: 'center' }}>
        <Eye size={26} strokeWidth={1.75} style={{ marginBottom: 6 }} />
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Xem trước kết quả
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>{fileName}</p>
      </div>

      {isLoading && <p style={{ textAlign: 'center', fontSize: 13.5, color: '#6B6B70' }}>Đang tải ảnh xem trước...</p>}
      {loadError && <p style={{ textAlign: 'center', fontSize: 13.5, color: '#D64545' }}>{loadError}</p>}
      {!isLoading && !loadError && images.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: 13.5, color: '#6B6B70' }}>Chưa có ảnh xem trước.</p>
      )}

      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          {images
            .slice()
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
            .map((img, i) => (
              <img
                key={img.url + i}
                src={img.url}
                alt={`Xem trước ${i + 1}`}
                style={{ width: '100%', borderRadius: 10, aspectRatio: '16 / 9', objectFit: 'cover' }}
              />
            ))}
        </div>
      )}

      {approveError && <p style={{ textAlign: 'center', fontSize: 13.5, color: '#D64545' }}>{approveError}</p>}

      <Button variant="primary" icon={CheckCircle2} disabled={isApproving || isLoading} onClick={handleApprove}>
        {isApproving ? 'Đang xử lý...' : 'Duyệt kết quả này'}
      </Button>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#9a9aa0' }}>
        File gốc chỉ mở tải sau khi bạn duyệt bản xem trước ở trên.
      </p>
    </StepCard>
  );
}
