import { HardDriveDownload } from 'lucide-react';
import './UploadZone.css'; // tái dùng .upload-zone--filled đã có sẵn

export default function DriveLinkCard({ driveLink, resolvedInfo, isResolving, onChange }) {
  const displayName = resolvedInfo?.fileName || (isResolving ? 'Đang kiểm tra file...' : 'Chưa xác định được tên file');

  return (
    <div className="upload-zone upload-zone--filled">
      <div className="upload-zone__file-icon">
        <HardDriveDownload size={26} strokeWidth={1.5} />
      </div>
      <div className="upload-zone__file-info">
        <p className="upload-zone__file-name">{displayName}</p>
        <p className="upload-zone__file-meta" style={{ wordBreak: 'break-all', fontSize: 12 }}>
          {driveLink}
        </p>
      </div>
      <button className="upload-zone__change-btn" onClick={onChange} type="button">
        Đổi link
      </button>
    </div>
  );
}
