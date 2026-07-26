import { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-dialog__header">
          <p className="modal-dialog__title">{title}</p>
          <button className="modal-dialog__close" onClick={onClose} aria-label="Đóng" type="button">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="modal-dialog__body">{children}</div>
      </div>
    </div>
  );
}
