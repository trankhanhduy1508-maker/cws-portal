import { History } from 'lucide-react';
import './PortalShell.css';

export default function PortalShell({ children, onOpenHistory }) {
  return (
    <div className="portal-shell">
      <header className="portal-shell__header">
        <div className="portal-shell__logo">
          <span className="portal-shell__logo-mark" />
          CWS
        </div>
        {onOpenHistory && (
          <button
            className="portal-shell__history-btn"
            onClick={onOpenHistory}
            aria-label="Xem lịch sử render"
            type="button"
          >
            <History size={20} strokeWidth={1.75} />
          </button>
        )}
      </header>
      <main className="portal-shell__main">
        {children}
      </main>
    </div>
  );
}
