import { motion } from 'framer-motion';
import { Clock, ShieldCheck, Cpu, LogIn, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';
import './LandingScreen.css';

const REASONS = [
  { icon: Clock, text: 'Máy bạn rảnh, việc vẫn xong — không cần treo máy qua đêm' },
  { icon: Cpu, text: 'Xử lý được cả file nặng hàng triệu polygon' },
  { icon: ShieldCheck, text: 'File của bạn được xoá sau khi tải xuống' },
];

/** Customer workflow Phase 1 starts with Google authentication.
 * Unauthenticated customers see the product introduction + Google Login.
 * Upload/Drive becomes available only after authentication succeeds.
 * Do not reorder this workflow without Founder approval. */
export default function LandingScreen({ isAuthenticated, customerName, isAuthLoading, authError, onGoogleLogin }) {
  return (
    <motion.div
      className="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="landing__scan" aria-hidden="true" />

      <h1 className="landing__title">
        Gửi file.<br />Nhận kết quả.
      </h1>
      <p className="landing__subtitle">
        CWS render file 3D của bạn trên mạng lưới máy tính đối tác —
        không cần chờ máy bạn tự render.
      </p>

      <div style={{ width: '100%', maxWidth: 320 }}>
        {isAuthenticated ? (
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: '#1C1C1E', fontWeight: 600 }}>
            <CheckCircle2 size={17} strokeWidth={2} color="#1FA37B" />
            Đã đăng nhập{customerName ? ` — ${customerName}` : ''}
          </p>
        ) : (
          <>
            <Button variant="secondary" icon={LogIn} onClick={onGoogleLogin} disabled={isAuthLoading}>
              {isAuthLoading ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
            </Button>
            <p style={{ fontSize: 12, color: '#6B6B70', textAlign: 'center', marginTop: 8 }}>
              Đăng nhập để tiếp tục gửi file render.
            </p>
          </>
        )}
        {authError && (
          <p role="alert" style={{ fontSize: 13, color: '#E5484D', textAlign: 'center', marginTop: 8 }}>
            {authError}
          </p>
        )}
      </div>

      <ul className="landing__reasons">
        {REASONS.map(({ icon: Icon, text }, i) => (
          <li key={i} className="landing__reason">
            <Icon size={18} strokeWidth={1.75} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
