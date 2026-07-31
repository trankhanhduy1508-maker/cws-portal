import { useRef, useCallback } from 'react';
import { UploadCloud, FileBox, AlertCircle } from 'lucide-react';
import { formatBytes } from '../utils/fileUtils';
import { ACCEPTED_FILE_EXTENSIONS } from '../constants/renderConstants';
import './UploadZone.css';

/** Chọn file bằng bấm nút — KHÔNG hỗ trợ kéo-thả (dropzone kéo-thả từng
 * gây hiểu nhầm trên mobile, nơi không có thao tác kéo-thả file). */
export default function UploadZone({ file, fileError, onFileSelected }) {
  const inputRef = useRef(null);

  const handleFiles = useCallback((fileList) => {
    const f = fileList?.[0];
    if (f) onFileSelected(f);
  }, [onFileSelected]);

  if (file) {
    return (
      <div className="upload-zone upload-zone--filled">
        <div className="upload-zone__file-icon">
          <FileBox size={28} strokeWidth={1.5} />
        </div>
        <div className="upload-zone__file-info">
          <p className="upload-zone__file-name">{file.name}</p>
          <p className="upload-zone__file-meta">{formatBytes(file.size)}</p>
        </div>
        <button
          className="upload-zone__change-btn"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Đổi file
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        className={`upload-zone ${fileError ? 'has-error' : ''}`}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        aria-label="Bấm để chọn file từ máy"
      >
        <div className="upload-zone__icon">
          <UploadCloud size={32} strokeWidth={1.5} />
        </div>
        <p className="upload-zone__title">Chọn file để tải lên</p>
        <p className="upload-zone__subtitle">Bấm để chọn từ máy</p>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {fileError && (
        <div className="upload-zone__error" role="alert">
          <AlertCircle size={16} strokeWidth={2} />
          <span>{fileError}</span>
        </div>
      )}
    </div>
  );
}
