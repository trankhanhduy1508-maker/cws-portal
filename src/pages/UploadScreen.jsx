import { useState } from 'react';
import { ArrowRight, HardDrive, Link2, Loader2 } from 'lucide-react';
import StepCard from '../components/StepCard';
import SourceTabs from '../components/SourceTabs';
import UploadZone from '../components/UploadZone';
import DriveLinkCard from '../components/DriveLinkCard';
import Button from '../components/Button';
import { FILE_SOURCE } from '../constants/renderConstants';

export default function UploadScreen({
  source, setSource,
  file, fileError, onFileSelected,
  driveLink, linkError, resolvedInfo, isResolving, onDriveLinkSubmit, onDriveLinkChange,
  onContinue, isContinuing, isAuthenticated, onGoogleLogin, isAuthLoading,
}) {
  const [driveInput, setDriveInput] = useState('');
  const hasValidInput = source === FILE_SOURCE.UPLOAD
    ? !!file && !fileError
    : !!driveLink && !linkError && !!resolvedInfo?.fileRef && !!resolvedInfo?.fileName
      && Number.isInteger(resolvedInfo?.fileSizeBytes) && resolvedInfo.fileSizeBytes > 0;

  return (
    <StepCard>
      <div className="new-render-heading">
        <div>
          <span className="new-render-heading__eyebrow">NEW RENDER</span>
          <h2>Start with your project</h2>
          <p>Upload a project or submit an approved Google Drive link.</p>
        </div>
        <span className="new-render-heading__badge">SECURE INPUT</span>
      </div>

      {!isAuthenticated ? (
        <div className="auth-required">
          <div className="auth-required__icon"><Link2 size={19} /></div>
          <div>
            <h3>Đăng nhập để gửi project</h3>
            <p>Google Login là bước đầu tiên trước khi CWS nhận input.</p>
          </div>
          <Button icon={ArrowRight} disabled={isAuthLoading} onClick={onGoogleLogin}>
            {isAuthLoading ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
          </Button>
        </div>
      ) : (
        <>
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
                onChange={onDriveLinkChange}
              />
            ) : (
              <form
                className="drive-submit"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!driveInput.trim() || isResolving) return;
                  onDriveLinkSubmit(driveInput.trim());
                }}
              >
                <label className="drive-submit__label" htmlFor="drive-url">
                  <span><HardDrive size={16} /> Google Drive URL</span>
                  <small>File .blend, .zip hoặc .rar</small>
                </label>
                <div className="drive-submit__row">
                  <div className="drive-submit__input-wrap">
                    <Link2 size={17} aria-hidden="true" />
                    <input
                      id="drive-url"
                      type="url"
                      value={driveInput}
                      onChange={(event) => setDriveInput(event.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      autoComplete="url"
                      aria-invalid={!!linkError}
                      aria-describedby={linkError ? 'drive-url-error' : undefined}
                    />
                  </div>
                  <button className="drive-submit__button" type="submit" disabled={!driveInput.trim() || isResolving}>
                    {isResolving ? <Loader2 size={17} className="spin" aria-hidden="true" /> : 'Gửi link Drive'}
                  </button>
                </div>
                {linkError && <p className="drive-submit__error" id="drive-url-error" role="alert">{linkError}</p>}
                {isResolving && <p className="drive-submit__status" role="status">Đang gửi link và kiểm tra an toàn...</p>}
              </form>
            )
          )}

          {source === FILE_SOURCE.UPLOAD && (
            <Button icon={ArrowRight} disabled={!hasValidInput || isContinuing} onClick={onContinue}>
              {isContinuing ? 'Đang kiểm tra an toàn...' : 'Gửi file và kiểm tra an toàn'}
            </Button>
          )}
        </>
      )}
    </StepCard>
  );
}
