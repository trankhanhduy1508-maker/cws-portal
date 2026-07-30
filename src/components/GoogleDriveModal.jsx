import { useState } from 'react';
import { AlertCircle, Link2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function GoogleDriveModal({ onClose, onSubmit, linkError, isResolving }) {
  const [value, setValue] = useState('');

  const handleSubmit = async () => {
    const ok = await onSubmit(value);
    if (ok) onClose();
  };

  return (
    <Modal title="Dán link chia sẻ" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Link2
            size={16}
            strokeWidth={2}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#B0B0B5' }}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://drive.google.com/file/d/... hoặc OneDrive/Dropbox"
            style={{
              width: '100%',
              padding: '14px 14px 14px 40px',
              borderRadius: 14,
              border: `1.5px solid ${linkError ? '#E5484D' : '#E8E8EA'}`,
              fontSize: 14.5,
              fontFamily: 'monospace',
              outline: 'none',
            }}
            autoFocus
          />
        </div>

        {linkError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E5484D', fontSize: 13.5 }}>
            <AlertCircle size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span>{linkError}</span>
          </div>
        )}

        <p style={{ fontSize: 13, color: '#B0B0B5', lineHeight: 1.5 }}>
          Đảm bảo file đã bật chia sẻ "Bất kỳ ai có link". Lưu ý: chỉ Google
          Drive được kiểm tra quyền truy cập tự động — OneDrive/Dropbox
          chưa kiểm tra được, hãy tự xác nhận link đã mở chia sẻ đúng.
        </p>

        <Button onClick={handleSubmit} disabled={!value.trim() || isResolving}>
          {isResolving ? 'Đang kiểm tra...' : 'Xác nhận link'}
        </Button>
      </div>
    </Modal>
  );
}
