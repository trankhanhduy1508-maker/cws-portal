import { useRef, useState, useCallback } from 'react';
import { UploadCloud, FileBox, AlertCircle } from 'lucide-react';
import { formatBytes } from '../utils/fileUtils';
import { ACCEPTED_FILE_EXTENSIONS } from '../constants/renderConstants';
import './UploadZone.css';

export default function UploadZone({ file, fileError, onFileSelected }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((fileList) => {
    const f = fileList?.[0];
    if (f) onFileSelected(f);
  }, [onFileSelected]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

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
        className={`upload-zone ${isDragging ? 'is-dragging' : ''} ${fileError ? 'has-error' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        aria-label="Kéo thả file vào đây hoặc bấm để chọn file"
      >
        {isDragging && <div className="upload-zone__scanline" />}
        <div className="upload-zone__icon">
          <UploadCloud size={32} strokeWidth={1.5} />
        </div>
        <p className="upload-zone__title">Kéo thả file vào đây</p>
        <p className="upload-zone__subtitle">hoặc bấm để chọn từ máy</p>
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
