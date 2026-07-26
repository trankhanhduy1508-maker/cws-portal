import { motion } from 'framer-motion';
import { ArrowRight, Clock, ShieldCheck, Cpu } from 'lucide-react';
import Button from '../components/Button';
import './LandingScreen.css';

const REASONS = [
  { icon: Clock, text: 'Máy bạn rảnh, việc vẫn xong — không cần treo máy qua đêm' },
  { icon: Cpu, text: 'Xử lý được cả file nặng hàng triệu polygon' },
  { icon: ShieldCheck, text: 'File của bạn được xoá sau khi tải xuống' },
];

export default function LandingScreen({ onStart }) {
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

      <div style={{ width: '100%', maxWidth: 320, marginTop: 8 }}>
        <Button icon={ArrowRight} onClick={onStart}>
          Bắt đầu render
        </Button>
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
