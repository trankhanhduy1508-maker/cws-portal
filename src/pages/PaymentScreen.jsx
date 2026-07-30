import { Loader2 } from 'lucide-react';
import StepCard from '../components/StepCard';
import StepDots from '../components/StepDots';
import { formatPriceVnd } from '../utils/timeUtils';

/** Hiển thị SAU KHI khách đã duyệt preview (CWS_MVP_WORKFLOW_FINAL.md:
 * "Khách duyệt → Sinh QR → Webhook xác nhận → PAID → Mở tải") — thuần
 * hiển thị, không có nút "xác nhận đã thanh toán" nào: xác nhận CHỈ đến
 * từ webhook ngân hàng, khách chỉ quét mã rồi chờ. Job tự chuyển sang
 * màn tải file khi Backend phát hiện webhook PAID (qua job.status). */
export default function PaymentScreen({ amountVnd, transferContent, qrImageUrl, onCancel }) {
  // SỬA LỖI (phát hiện qua tự rà soát 31/07/2026): trước đây App.jsx
  // truyền `job.paymentInfo?.amountVnd ?? estimates[...].costVnd` - nếu
  // WebSocket báo status=AWAITING_PAYMENT TRƯỚC KHI approve() (REST) kịp
  // set paymentInfo (khoảng trống rất ngắn, tính bằng mili-giây), màn
  // hình sẽ hiện SỐ TIỀN ƯỚC TÍNH (heuristic trước render, SAI) thay vì
  // giá thật vừa tính xong — dù tự sửa lại gần như ngay lập tức. Giờ
  // KHÔNG còn fallback nào ở App.jsx nữa (xem App.jsx) — CHỈ hiện QR/số
  // tiền khi `transferContent` (dữ liệu THẬT từ payment) đã có, còn
  // không thì hiện "đang tải", KHÔNG BAO GIỜ hiện số tiền chưa chắc đúng.
  if (!transferContent) {
    return (
      <StepCard>
        <StepDots total={5} current={3} />
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Loader2 size={20} strokeWidth={2} style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 14, color: '#6B6B70' }}>Đang tải thông tin thanh toán...</p>
        </div>
        <button
          onClick={onCancel}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: '#6B6B70', fontWeight: 600, padding: 8 }}
          type="button"
        >
          Hủy job
        </button>
      </StepCard>
    );
  }

  return (
    <StepCard>
      <StepDots total={5} current={3} />

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
          Thanh toán
        </h2>
        <p style={{ fontSize: 14, color: '#6B6B70' }}>
          Quét mã QR MB Bank để mở tải file gốc
        </p>
      </div>

      <div style={{ padding: '16px 18px', borderRadius: 16, background: '#EEF0FF', textAlign: 'center' }}>
        <p style={{ fontSize: 12.5, color: '#3B5BFF', fontWeight: 600, marginBottom: 4 }}>Số tiền cần thanh toán</p>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 24, fontWeight: 500, color: '#1C1C1E' }}>
          {formatPriceVnd(amountVnd)}
        </p>
      </div>

      <div style={{ padding: '14px 16px', borderRadius: 14, background: '#F7F7F8', textAlign: 'center' }}>
        {qrImageUrl ? (
          <img
            src={qrImageUrl}
            alt="Mã QR chuyển khoản MB Bank"
            style={{ width: '100%', maxWidth: 220, borderRadius: 10, marginBottom: 10 }}
          />
        ) : (
          <p style={{ fontSize: 12, color: '#9a9aa0', marginBottom: 8 }}>
            Chưa cấu hình tài khoản MB Bank thật — chuyển khoản thủ công với nội dung bên dưới:
          </p>
        )}
        <p style={{ fontSize: 12.5, color: '#6B6B70', marginBottom: 4 }}>
          Chuyển khoản với nội dung chính xác:
        </p>
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 8 }}>
          {transferContent}
        </p>
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#9a9aa0' }}>
          <Loader2 size={13} strokeWidth={2} />
          Đang chờ ngân hàng xác nhận giao dịch...
        </p>
      </div>

      <button
        onClick={onCancel}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: '#6B6B70', fontWeight: 600, padding: 8 }}
        type="button"
      >
        Hủy job
      </button>
    </StepCard>
  );
}
