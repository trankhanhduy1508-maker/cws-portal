import { motion } from 'framer-motion';
import { Clock, ShieldCheck, Cpu, LogIn, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';
import './LandingScreen.css';

const REASONS = [
  { icon: Clock, text: 'Máy bạn rảnh, việc vẫn xong — không cần treo máy qua đêm' },
  { icon: Cpu, text: 'Xử lý được cả file nặng hàng triệu polygon' },
  { icon: ShieldCheck, text: 'File chỉ được mở tải sau khi bạn duyệt và thanh toán' },
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
        {!isAuthenticated && (
          <p style={{ fontSize: 12.5, color: '#6B6B70', textAlign: 'center', lineHeight: 1.45, marginTop: 8 }}>
            Google chỉ dùng để xác thực tài khoản CWS; CWS không yêu cầu quyền đọc Google Drive của bạn.
          </p>
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

      <details style={{ width: '100%', maxWidth: 460, marginTop: 18, textAlign: 'left' }}>
        <summary style={{ cursor: 'pointer', fontSize: 13.5, color: '#3B5BFF', fontWeight: 600 }}>
          CWS hoạt động như thế nào?
        </summary>
        <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 12, background: '#F7F7F8', color: '#6B6B70', fontSize: 13, lineHeight: 1.55 }}>
          <p>Worker là máy tính thật do đối tác vận hành. Thời gian chờ phụ thuộc số máy đang online.</p>
          <p style={{ marginTop: 6 }}>Bạn xem preview có watermark trước; chỉ thanh toán sau khi duyệt để mở tải thành phẩm.</p>
          <p style={{ marginTop: 6 }}>MVP hiện hỗ trợ file Blender (.blend) tối đa 2GB và link Google Drive/OneDrive/Dropbox/Direct Link.</p>
        </div>
      </details>
    </motion.div>
  );
}
