import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import Button from '../components/Button';
import './LandingScreen.css';

/** Google Login (DECISIONS.md: "Google OAuth qua Supabase Auth duy nhất cho MVP"). */
export default function LoginScreen({ onLogin, isLoading, error }) {
  return (
    <motion.div
      className="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="landing__title">Đăng nhập để tiếp tục</h1>
      <p className="landing__subtitle">
        CWS chỉ dùng Google để đăng nhập — không cần tạo mật khẩu mới.
      </p>

      <div style={{ width: '100%', maxWidth: 320, marginTop: 8 }}>
        <Button icon={LogIn} onClick={onLogin} disabled={isLoading}>
          {isLoading ? 'Đang đăng nhập...' : error ? 'Thử lại đăng nhập với Google' : 'Đăng nhập với Google'}
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          style={{ fontSize: 13.5, color: '#E5484D', textAlign: 'center', marginTop: 12 }}
        >
          {error}
        </p>
      )}
    </motion.div>
  );
}
