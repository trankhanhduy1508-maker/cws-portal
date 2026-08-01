import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';
import Button from '../components/Button';
import { staffLogin, getStaffMe } from '../services/staffApi';
import './LandingScreen.css';

const inputStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 10,
  border: '1.5px solid #E8E8EA',
  fontSize: 14,
  outline: 'none',
};

/** Đăng nhập Admin/Host THẬT (Phần 6) — tách biệt hoàn toàn khỏi
 * LoginScreen.jsx (Google, dành cho khách hàng). Tài khoản tạo thủ
 * công qua Supabase (xem backend/migrations/013_staff_roles_rbac.sql),
 * không có màn hình tự đăng ký. Sau khi đăng nhập, gọi GET /staff/me để
 * biết role thật rồi điều hướng #admin/#host — KHÔNG tự đoán ở đây. */
export default function StaffLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await staffLogin(email, password);
      const me = await getStaffMe();
      window.location.hash = me.role === 'host' ? '#host' : '#admin';
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="landing__title">Đăng nhập nhân sự</h1>
      <p className="landing__subtitle">Dành cho Admin/Host — không phải khách hàng.</p>

      <form
        onSubmit={handleSubmit}
        style={{ width: '100%', maxWidth: 320, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={inputStyle}
          autoFocus
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          style={inputStyle}
          required
        />
        <Button icon={KeyRound} disabled={isLoading}>
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>

      {error && (
        <p role="alert" style={{ fontSize: 13.5, color: '#E5484D', textAlign: 'center', marginTop: 12 }}>
          {error}
        </p>
      )}
    </motion.div>
  );
}
