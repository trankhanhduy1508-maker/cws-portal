import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function CancelConfirmModal({ onClose, onConfirm }) {
  return (
    <Modal title="Hủy render?" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: 999,
              background: '#FDECEC', color: '#E5484D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <AlertTriangle size={18} strokeWidth={1.75} />
          </div>
          <p style={{ fontSize: 14, color: '#1C1C1E', lineHeight: 1.5 }}>
            Toàn bộ tiến trình đang render sẽ bị hủy và không thể khôi phục.
            Bạn có chắc muốn hủy không?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onConfirm}
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: '#E5484D', color: '#FFFFFF', fontWeight: 600, fontSize: 15,
            }}
            type="button"
          >
            Hủy render
          </button>
          <Button onClick={onClose} variant="secondary">
            Tiếp tục render
          </Button>
        </div>
      </div>
    </Modal>
  );
}
