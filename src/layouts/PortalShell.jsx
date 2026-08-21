import { History, LogOut } from 'lucide-react';
import './PortalShell.css';

export default function PortalShell({ children, onOpenHistory, isAuthenticated, onLogout }) {
  return (
    <div className="portal-shell">
      <header className="portal-shell__header">
        <div className="portal-shell__header-inner">
          <div className="portal-shell__brand">
            <div className="portal-shell__logo">
              <span className="portal-shell__logo-mark" aria-hidden="true">C</span>
              <span className="portal-shell__logo-word">CWS</span>
            </div>
            <span className="portal-shell__section-label">Render workspace</span>
          </div>
          <div className="portal-shell__actions">
            {onOpenHistory && (
              <button
                className="portal-shell__nav-btn"
                onClick={onOpenHistory}
                aria-label="Xem lịch sử render"
                title="Lịch sử render"
                type="button"
              >
                <History size={17} strokeWidth={1.8} />
                <span>Lịch sử</span>
              </button>
            )}
            {isAuthenticated && onLogout && (
              <button
                className="portal-shell__icon-btn"
                onClick={onLogout}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                type="button"
              >
                <LogOut size={17} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="portal-shell__main">
        {children}
      </main>
    </div>
  );
}
