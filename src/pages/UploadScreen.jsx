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
  software, setSoftware, softwareVersion, setSoftwareVersion, notes, setNotes,
  onContinue, isContinuing,
}) {
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  const hasValidInput = source === FILE_SOURCE.UPLOAD ? !!file && !fileError : !!driveLink && !linkError;

  return (
    <StepCard>
      <StepDots total={5} current={0} />

      <div>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Gửi file của bạn
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>
          Hỗ trợ file Blender (.blend)
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
              Dán link chia sẻ (Google Drive/OneDrive/Dropbox)
            </p>
            <p style={{ fontSize: 13, color: '#6B6B70', marginTop: 4 }}>
              Bấm để nhập link
            </p>
          </button>
        )
      )}

      {/* Phần mềm/Phiên bản/Ghi chú — CWS_MVP_WORKFLOW_FINAL.md, mục "Tạo
          Job" ("Khách nhập: ... Phần mềm. Phiên bản. ... Ghi chú.").
          Không bắt buộc — Worker hiện chỉ render Blender (.blend) nên
          đây chủ yếu là thông tin tham khảo cho admin, không phải điều
          kiện chặn tạo job. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={software}
            onChange={(e) => setSoftware(e.target.value)}
            placeholder="Phần mềm (vd Blender)"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #E8E8EA', fontSize: 13.5 }}
          />
          <input
            value={softwareVersion}
            onChange={(e) => setSoftwareVersion(e.target.value)}
            placeholder="Phiên bản (vd 4.2)"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #E8E8EA', fontSize: 13.5 }}
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ghi chú cho đội render (không bắt buộc)"
          rows={2}
          style={{ padding: 10, borderRadius: 10, border: '1.5px solid #E8E8EA', fontSize: 13.5, resize: 'vertical' }}
        />
      </div>

      <Button icon={ArrowRight} disabled={!hasValidInput || isContinuing} onClick={onContinue}>
        {isContinuing ? 'Đang tải lên...' : 'Tiếp tục'}
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
