import { UploadCloud, HardDriveDownload } from 'lucide-react';
import { FILE_SOURCE } from '../constants/renderConstants';
import './SourceTabs.css';

const TABS = [
  { id: FILE_SOURCE.UPLOAD, label: 'Tải file lên', icon: UploadCloud },
  { id: FILE_SOURCE.GOOGLE_DRIVE, label: 'Google Drive', icon: HardDriveDownload },
];

export default function SourceTabs({ active, onChange }) {
  return (
    <div className="source-tabs" role="tablist">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`source-tab ${active === id ? 'is-active' : ''}`}
          onClick={() => onChange(id)}
          role="tab"
          aria-selected={active === id}
          type="button"
        >
          <Icon size={16} strokeWidth={1.75} />
          {label}
        </button>
      ))}
    </div>
  );
}
