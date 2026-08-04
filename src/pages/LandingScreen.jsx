import { motion } from 'framer-motion';
import { Clock, ShieldCheck, Cpu, LogIn, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';
import './LandingScreen.css';

const REASONS = [
  { icon: Clock, text: 'Máy bạn rảnh, việc vẫn xong — không cần treo máy qua đêm' },
  { icon: Cpu, text: 'Xử lý được cả file nặng hàng triệu polygon' },
  { icon: ShieldCheck, text: 'Link tải thành phẩm ngắn hạn — có thể cấp lại khi cần' },
];

/** Hero + trạng thái đăng nhập Google — không còn là 1 bước riêng phải
 * bấm "Bắt đầu" mới thấy được (khách cần thấy ngay Upload/Drive link ở
 * trang đầu). Đăng nhập chỉ thực sự BẮT BUỘC khi khách bấm "Bắt đầu
 * render" ở UploadScreen render ngay bên dưới trang này (xem
 * App.jsx#handleContinueFromUpload) — nút Google ở đây chỉ là lối tắt
 * cho khách muốn đăng nhập trước khi chọn file/dán link. */
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
          <Button variant="secondary" icon={LogIn} onClick={onGoogleLogin} disabled={isAuthLoading}>
            {isAuthLoading ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
          </Button>
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
