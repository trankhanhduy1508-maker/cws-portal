import { useState, useEffect } from 'react';
import { CheckCircle2, Download, BadgeCheck } from 'lucide-react';
import StepCard from '../components/StepCard';
import StepDots from '../components/StepDots';
import { formatDuration } from '../utils/timeUtils';
import { formatBytes } from '../utils/fileUtils';
import { getDownloadUrl } from '../services/RenderService';
import { IS_BACKEND_CONFIGURED } from '../services/apiConfig';
import './PreviewDownloadScreen.css';

export default function PreviewDownloadScreen({ jobId, fileName, downloadUrl, isPlaceholder, durationSec, resultSizeBytes }) {
  // Backend thật: LUÔN tải qua route có ghi log (CWS_DATABASE_SCHEMA.md,
  // bảng downloads) — không dùng thẳng downloadUrl raw dù đã có sẵn
  // trong tay, để mọi lượt tải đều được backend biết. Mock: không có
  // route log thật, dùng thẳng Blob URL như cũ.
  // getDownloadUrl() giờ là async (cần đính kèm access token qua query
  // string, xem RenderService.js) nên phải load qua state thay vì gọi
  // thẳng trong render.
  const [realHref, setRealHref] = useState(null);
  useEffect(() => {
    if (!IS_BACKEND_CONFIGURED) return;
    let cancelled = false;
    getDownloadUrl(jobId).then((url) => { if (!cancelled) setRealHref(url); });
    return () => { cancelled = true; };
  }, [jobId]);
  const href = IS_BACKEND_CONFIGURED ? realHref : downloadUrl;

  // File cuối giờ có thể là .mp4 (ghép video) HOẶC .zip (fallback không
  // có ffmpeg, xem PackagingService) — KHÔNG cố định phần mở rộng theo
  // tên file gốc khách gửi lên (vd "scene.blend"), phải đọc thật từ
  // downloadUrl để gợi ý tên tải về đúng định dạng thật.
  const resultExtension = downloadUrl?.match(/\.(mp4|zip)(?:$|\?)/i)?.[1]?.toLowerCase();
  const baseName = fileName ? fileName.replace(/\.[^./]+$/, '') : null;
  const downloadFileName = resultExtension
    ? `render-${baseName || 'result'}.${resultExtension}`
    : (fileName ? `render-${fileName}` : true);
  return (
    <StepCard>
      <StepDots total={5} current={4} />

      <div className="download-success-icon">
        <CheckCircle2 size={30} strokeWidth={1.75} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Render xong rồi!
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>
          {fileName}
        </p>
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12.5, color: '#2AB673', fontWeight: 600, marginTop: 6 }}>
          <BadgeCheck size={14} strokeWidth={2} />
          Đã thanh toán
        </p>
      </div>

      <div className="preview-frame">
        <div className="preview-frame__gradient" />
        <div className="preview-frame__watermark">
          <span className="preview-frame__watermark-text">CWS PREVIEW · CWS PREVIEW</span>
        </div>
        <span className="preview-frame__badge">Xem trước</span>
      </div>

      {(durationSec != null || resultSizeBytes != null) && (
        <div style={{ display: 'flex', gap: 10 }}>
          {durationSec != null && (
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: '#F7F7F8', borderRadius: 12 }}>
              <p style={{ fontSize: 11.5, color: '#6B6B70', marginBottom: 2 }}>Thời gian render</p>
              <p style={{ fontFamily: 'monospace', fontSize: 13.5, fontWeight: 500, color: '#1C1C1E' }}>
                {formatDuration(durationSec)}
              </p>
            </div>
          )}
          {resultSizeBytes != null && (
            <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: '#F7F7F8', borderRadius: 12 }}>
              <p style={{ fontSize: 11.5, color: '#6B6B70', marginBottom: 2 }}>Dung lượng</p>
              <p style={{ fontFamily: 'monospace', fontSize: 13.5, fontWeight: 500, color: '#1C1C1E' }}>
                {formatBytes(resultSizeBytes)}
              </p>
            </div>
          )}
        </div>
      )}

      <a
        href={href || '#'}
        download={downloadFileName}
        className="btn btn--primary btn--full"
        style={{ textDecoration: 'none' }}
        aria-disabled={!href}
        onClick={(e) => { if (!href) e.preventDefault(); }}
      >
        <Download size={18} strokeWidth={2} />
        Tải thành phẩm
      </a>

      <p className="download-expiry-note">
        {isPlaceholder
          ? 'Bản demo: đang tải lại chính file bạn đã gửi (chưa có kết quả render thật từ Backend)'
          : 'Link tải có hiệu lực trong 5 phút. Nếu hết hạn, bấm Tải thành phẩm lại để cấp link mới.'}
      </p>
    </StepCard>
  );
}
