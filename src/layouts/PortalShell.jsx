import { History, LogOut } from 'lucide-react';
import './PortalShell.css';

export default function PortalShell({ children, onOpenHistory, isAuthenticated, onLogout }) {
  return (
    <div className="portal-shell">
      <header className="portal-shell__header">
        <div className="portal-shell__logo">
          <span className="portal-shell__logo-mark" aria-hidden="true">
            <span className="portal-shell__logo-plane portal-shell__logo-plane--one" />
            <span className="portal-shell__logo-plane portal-shell__logo-plane--two" />
          </span>
          <span className="portal-shell__logo-word">CWS</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
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
          {isAuthenticated && onLogout && (
            <button
              className="portal-shell__history-btn"
              onClick={onLogout}
              aria-label="Đăng xuất"
              type="button"
            >
              <LogOut size={20} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>
      <main className="portal-shell__main">
        {children}
      </main>
    </div>
  );
}
