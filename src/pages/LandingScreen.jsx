import { motion } from 'framer-motion';
import { Clock3, ShieldCheck, Cpu, LogIn, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';
import './LandingScreen.css';

const REASONS = [
  { icon: Clock3, text: 'Máy bận, công việc vẫn tiếp tục — không cần treo máy qua đêm' },
  { icon: Cpu, text: 'Xử lý project nặng với quy trình render chuyên nghiệp' },
  { icon: ShieldCheck, text: 'Input được kiểm tra an toàn trước khi vào pipeline' },
];

export default function LandingScreen({ isAuthenticated, customerName, isAuthLoading, authError, onGoogleLogin }) {
  return (
    <motion.div className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="landing__eyebrow">CWS / CUSTOMER WORKSPACE</div>
      <h1 className="landing__title">Render project<br />without the wait.</h1>
      <p className="landing__subtitle">
        Gửi project Blender của bạn lên CWS và theo dõi tiến trình trong một workspace rõ ràng, an toàn.
      </p>
      <div className="landing__auth">
        {isAuthenticated ? (
          <p className="landing__signed-in">
            <CheckCircle2 size={17} strokeWidth={2} />
            Đã đăng nhập{customerName ? ' — ' + customerName : ''}
          </p>
        ) : (
          <>
            <Button icon={LogIn} onClick={onGoogleLogin} disabled={isAuthLoading}>
              {isAuthLoading ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
            </Button>
            <p className="landing__auth-note">Đăng nhập để bắt đầu một render mới.</p>
          </>
        )}
        {authError && <p role="alert" className="landing__auth-error">{authError}</p>}
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
