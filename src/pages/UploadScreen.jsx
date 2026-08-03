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

export default function UploadScreen({
  source, setSource,
  file, fileError, onFileSelected,
  isValidatingFile,
  driveLink, linkError, resolvedInfo, isResolving, onDriveLinkSubmit,
  onContinue, isContinuing,
  uploadProgress,
}) {
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  const hasValidInput = source === FILE_SOURCE.UPLOAD ? !!file && !fileError && !isValidatingFile : !!driveLink && !linkError;

  return (
    <StepCard>
      <StepDots total={5} current={0} />

      <div>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Gửi file của bạn
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>
          Hỗ trợ file Blender (.blend), tối đa 2GB. File sẽ được render trước khi bạn duyệt và thanh toán;
          thời gian chờ phụ thuộc Worker đang online. CWS chỉ yêu cầu đăng nhập Google khi bạn
          bắt đầu render để gắn job vào tài khoản và cho phép bạn theo dõi lịch sử.
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

      <Button icon={ArrowRight} disabled={!hasValidInput || isContinuing || isValidatingFile} onClick={onContinue}>
        {isValidatingFile ? 'Đang kiểm tra file...' : (isContinuing ? 'Đang xử lý...' : 'Bắt đầu render')}
      </Button>

      {isContinuing && source === FILE_SOURCE.UPLOAD && (
        <div role="status" style={{ fontSize: 12.5, color: '#6B6B70' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span>Đang tải file lên Backend...</span>
            <span>{uploadProgress > 0 ? `${uploadProgress}%` : 'Đang kết nối...'}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
            <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3B5BFF', transition: 'width 160ms ease' }} />
          </div>
          <p style={{ marginTop: 5 }}>Nếu mạng bị ngắt, phiên upload hiện tại sẽ báo lỗi để bạn thử lại; resumable upload vẫn là gap backend riêng.</p>
        </div>
      )}

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
