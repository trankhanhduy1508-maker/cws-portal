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
  driveLink, linkError, resolvedInfo, isResolving, onDriveLinkSubmit,
  onContinue, isContinuing, isAuthenticated, onGoogleLogin, isAuthLoading,
}) {
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  const hasValidInput = source === FILE_SOURCE.UPLOAD
    ? !!file && !fileError
    : !!driveLink && !linkError && !!resolvedInfo?.fileRef && !!resolvedInfo?.fileName
      && Number.isInteger(resolvedInfo?.fileSizeBytes) && resolvedInfo.fileSizeBytes > 0;

  return (
    <StepCard>
      <StepDots total={5} current={0} />

      {!isAuthenticated ? (
        <div style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
              Đăng nhập để bắt đầu
            </h2>
            <p style={{ fontSize: 14, color: '#6B6B70' }}>
              Vui lòng đăng nhập Google trước khi tải file hoặc gửi link Google Drive.
            </p>
          </div>
          <Button icon={ArrowRight} disabled={isAuthLoading} onClick={onGoogleLogin}>
            {isAuthLoading ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
          </Button>
        </div>
      ) : (
        <>

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
              Dán link file Google Drive
            </p>
            <p style={{ fontSize: 13, color: '#6B6B70', marginTop: 4 }}>
              Bấm để nhập link
            </p>
          </button>
        )
      )}

      {source === FILE_SOURCE.UPLOAD && (
        <Button icon={ArrowRight} disabled={!hasValidInput || isContinuing} onClick={onContinue}>
          {isContinuing ? 'Đang kiểm tra an toàn...' : 'Gửi file và kiểm tra an toàn'}
        </Button>
      )}

      {isDriveModalOpen && (
        <GoogleDriveModal
          onClose={() => setIsDriveModalOpen(false)}
          onSubmit={onDriveLinkSubmit}
          linkError={linkError}
          isResolving={isResolving}
        />
      )}
        </>
      )}
    </StepCard>
  );
}
