import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import StepCard from '../components/StepCard';
import StepDots from '../components/StepDots';
import SourceTabs from '../components/SourceTabs';
import UploadZone from '../components/UploadZone';
import DriveLinkCard from '../components/DriveLinkCard';
import GoogleDriveModal from '../components/GoogleDriveModal';
import Button from '../components/Button';
import { FILE_SOURCE } from '../constants/renderConstants';
import { useAuth } from '../hooks/useAuth';

export default function UploadScreen({
  source, setSource,
  file, fileError, onFileSelected,
  driveLink, linkError, resolvedInfo, isResolving, onDriveLinkSubmit,
  onContinue, isContinuing,
}) {
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Customer workflow Phase 1 is intentionally gated by Google login:
  // Login -> Upload/Drive -> Validate -> remaining render flow.
  // Keep this guard local and defensive even though App.jsx also protects
  // the continue action, so unauthenticated customers cannot interact with
  // upload/Drive UI before completing Google authentication.
  if (!isAuthenticated) return null;

  const hasValidInput = source === FILE_SOURCE.UPLOAD ? !!file && !fileError : !!driveLink && !linkError;

  return (
    <StepCard>
      <StepDots total={5} current={0} />

      <div>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Gửi file của bạn
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>
          Hỗ trợ file Blender (.blend) hoặc thư mục dự án đóng gói (.zip, .rar)
        </p>
      </div>

      <SourceTabs active={source} onChange={setSource} />

      {source === FILE_SOURCE.UPLOAD && (
        <UploadZone file={file} fileError={fileError} onFileSelected={onFileSelected} />
      )}

      {source === FILE_SOURCE.GOOGLE_DRIVE && (
        driveLink ? (
          <DriveLinkCard
            driveLink={driveLink}
            resolvedInfo={resolvedInfo}
            isResolving={isResolving}
            onChange={() => setIsDriveModalOpen(true)}
          />
        ) : (
          <button
            onClick={() => setIsDriveModalOpen(true)}
            className="upload-zone"
            style={{ width: '100%' }}
            type="button"
          >
            <p style={{ fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: 600 }}>
              Dán link chia sẻ (Google Drive/OneDrive/Dropbox/Direct Link)
            </p>
            <p style={{ fontSize: 13, color: '#6B6B70', marginTop: 4 }}>
              Bấm để nhập link
            </p>
          </button>
        )
      )}

      <Button icon={ArrowRight} disabled={!hasValidInput || isContinuing} onClick={onContinue}>
        {isContinuing ? 'Đang xử lý...' : 'Bắt đầu render'}
      </Button>

      {isDriveModalOpen && (
        <GoogleDriveModal
          onClose={() => setIsDriveModalOpen(false)}
          onSubmit={onDriveLinkSubmit}
          linkError={linkError}
          isResolving={isResolving}
        />
      )}
    </StepCard>
  );
}
