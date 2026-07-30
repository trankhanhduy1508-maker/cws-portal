import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Eye, MessageSquareWarning } from 'lucide-react';
import StepCard from '../components/StepCard';
import StepDots from '../components/StepDots';
import Button from '../components/Button';
import { getJobPreview, requestJobChanges } from '../services/RenderService';

/** Khách xem 3-5 ảnh preview (đã watermark "CWS RENDER") và bấm duyệt
 * trước khi Backend đóng gói + mở link tải file gốc (CWS_ROADMAP_MVP_V1.md,
 * Giai đoạn 4 — "Khách chỉ xem preview, chưa được tải file gốc"). Khách
 * cũng có thể yêu cầu chỉnh sửa thay vì duyệt (CWS_MVP_WORKFLOW_FINAL.md,
 * mục Review) — job vẫn ở REVIEW_READY sau đó, admin liên hệ khách thủ
 * công để xử lý (re-render/hoàn tiền là quyết định nghiệp vụ, không tự
 * động hoá ở đây). */
export default function ReviewScreen({ jobId, fileName, onApprove }) {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [note, setNote] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [requestSent, setRequestSent] = useState(false);

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

  const handleSendRequestChanges = useCallback(async () => {
    setIsRequesting(true);
    setRequestError(null);
    try {
      await requestJobChanges(jobId, note);
      setRequestSent(true);
      setShowRequestForm(false);
    } catch (err) {
      setRequestError(err.message || 'Gửi yêu cầu chỉnh sửa thất bại');
    } finally {
      setIsRequesting(false);
    }
  }, [jobId, note]);

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

      {requestSent && (
        <p style={{ textAlign: 'center', fontSize: 13.5, color: '#2E7D32' }}>
          Đã gửi yêu cầu chỉnh sửa. CWS sẽ liên hệ bạn sớm nhất — bạn vẫn có thể duyệt bản trên nếu đổi ý.
        </p>
      )}

      {!requestSent && !showRequestForm && (
        <Button
          variant="secondary"
          icon={MessageSquareWarning}
          disabled={isApproving || isLoading}
          onClick={() => setShowRequestForm(true)}
        >
          Yêu cầu chỉnh sửa
        </Button>
      )}

      {!requestSent && showRequestForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mô tả chỗ bạn muốn chỉnh sửa (không bắt buộc)"
            rows={3}
            style={{ padding: 10, borderRadius: 10, border: '1.5px solid #E8E8EA', fontSize: 13.5, resize: 'vertical' }}
          />
          {requestError && <p style={{ textAlign: 'center', fontSize: 13.5, color: '#D64545' }}>{requestError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" disabled={isRequesting} onClick={() => setShowRequestForm(false)}>
              Hủy
            </Button>
            <Button variant="primary" disabled={isRequesting} onClick={handleSendRequestChanges}>
              {isRequesting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </Button>
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 12, color: '#9a9aa0' }}>
        File gốc chỉ mở tải sau khi bạn duyệt bản xem trước ở trên.
      </p>
    </StepCard>
  );
}
