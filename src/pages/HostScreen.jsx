import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { getHostDashboard, staffLogout } from '../services/staffApi';
import { formatRelativeTime } from '../utils/timeUtils';

function formatDurationSeconds(totalSeconds) {
  const s = Math.round(totalSeconds ?? 0);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return minutes > 0 ? `${minutes}p ${seconds}s` : `${seconds}s`;
}

const th = { padding: 8, textAlign: 'left' };
const td = { padding: 8 };

/**
 * Host Dashboard MVP (Phần 6) — CHỈ đọc, dữ liệu đã được Backend lọc
 * theo ĐÚNG worker của Host đang đăng nhập (host.controller.ts + RoleGuard,
 * xem staff_worker_access). Frontend KHÔNG tự lọc thêm gì — nếu Backend
 * trả sai phạm vi thì đó là lỗi Backend cần sửa ở đó, không phải che ở
 * đây. Vào qua #host (App.jsx), yêu cầu đã đăng nhập qua StaffLoginScreen.
 */
export default function HostScreen() {
  const [data, setData] = useState({ workers: [], incidents: [], hostUsageSessions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    getHostDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await staffLogout();
    window.location.hash = '#staff-login';
    window.location.reload();
  };

  const totalBillableHours = data.hostUsageSessions.reduce((sum, s) => sum + (s.billableSeconds || 0), 0) / 3600;
  const totalEstimatedAmount = data.hostUsageSessions.reduce((sum, s) => sum + (s.estimatedAmount || s.finalAmount || 0), 0);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 20 }}>Host Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E8E8EA', background: '#fff' }}>
            <RefreshCw size={14} /> Làm mới
          </button>
          <button onClick={handleLogout} style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E8E8EA', background: '#fff' }}>
            Đăng xuất
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#E5484D', fontSize: 13.5, marginBottom: 12 }}>{error}</p>}
      {isLoading && <p>Đang tải...</p>}

      {!isLoading && !error && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px', padding: 14, borderRadius: 12, border: '1.5px solid #E8E8EA' }}>
              <p style={{ fontSize: 12, color: '#6B6B70' }}>Số máy</p>
              <p style={{ fontSize: 22, fontWeight: 600 }}>{data.workers.length}</p>
            </div>
            <div style={{ flex: '1 1 160px', padding: 14, borderRadius: 12, border: '1.5px solid #E8E8EA' }}>
              <p style={{ fontSize: 12, color: '#6B6B70' }}>Giờ đóng góp</p>
              <p style={{ fontSize: 22, fontWeight: 600 }}>{totalBillableHours.toFixed(1)}h</p>
            </div>
            <div style={{ flex: '1 1 160px', padding: 14, borderRadius: 12, border: '1.5px solid #E8E8EA' }}>
              <p style={{ fontSize: 12, color: '#6B6B70' }}>Doanh thu ước tính</p>
              <p style={{ fontSize: 22, fontWeight: 600 }}>{Math.round(totalEstimatedAmount).toLocaleString('vi-VN')}đ</p>
            </div>
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Máy của bạn</h2>
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={th}>Worker</th>
                  <th style={th}>GPU</th>
                  <th style={th}>Trạng thái</th>
                  <th style={th}>Task hiện tại</th>
                  <th style={th}>Hoạt động gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {data.workers.length === 0 && (
                  <tr><td style={td} colSpan={5}>Chưa có máy nào được gán cho tài khoản này.</td></tr>
                )}
                {data.workers.map((w) => (
                  <tr key={w.workerId} style={{ borderBottom: '1px solid #F0F0F2' }}>
                    <td style={{ ...td, wordBreak: 'break-all' }}>{w.workerId}</td>
                    <td style={td}>{w.gpuName || '—'}</td>
                    <td style={td}>{w.status}</td>
                    <td style={td}>{w.currentTaskId ?? '—'}</td>
                    <td style={td}>{formatRelativeTime(w.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Lỗi gần nhất</h2>
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={th}>Worker</th>
                  <th style={th}>Loại</th>
                  <th style={th}>Tóm tắt</th>
                  <th style={th}>Thời điểm</th>
                </tr>
              </thead>
              <tbody>
                {data.incidents.length === 0 && (
                  <tr><td style={td} colSpan={4}>Chưa có sự cố nào.</td></tr>
                )}
                {data.incidents.map((inc) => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #F0F0F2' }}>
                    <td style={{ ...td, wordBreak: 'break-all' }}>{inc.workerId}</td>
                    <td style={td}>{inc.eventType}</td>
                    <td style={{ ...td, wordBreak: 'break-word' }}>{inc.summary}</td>
                    <td style={td}>{formatRelativeTime(inc.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Phiên sử dụng (billing)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={th}>Worker</th>
                  <th style={th}>Billable</th>
                  <th style={th}>Ước tính</th>
                  <th style={th}>Cuối cùng</th>
                  <th style={th}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.hostUsageSessions.length === 0 && (
                  <tr><td style={td} colSpan={5}>Chưa có phiên nào.</td></tr>
                )}
                {data.hostUsageSessions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F0F0F2' }}>
                    <td style={{ ...td, wordBreak: 'break-all' }}>{s.workerId}</td>
                    <td style={td}>{formatDurationSeconds(s.billableSeconds)}</td>
                    <td style={td}>{s.estimatedAmount ? `${Math.round(s.estimatedAmount).toLocaleString('vi-VN')}đ` : '—'}</td>
                    <td style={td}>{s.finalAmount ? `${Math.round(s.finalAmount).toLocaleString('vi-VN')}đ` : '—'}</td>
                    <td style={td}>{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
