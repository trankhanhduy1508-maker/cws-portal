import { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, Moon, RefreshCw, UserRound, Wifi, WifiOff, Zap } from 'lucide-react';
import StaffMfaLogin from '../components/StaffMfaLogin';
import { adminListCustomers, adminListWorkers } from '../services/adminApi';
import { signOutStaff } from '../services/staffAuth';

function Metric({ label, value, icon: Icon, tone }) {
  return (
    <div style={{ flex: '1 1 180px', padding: 18, borderRadius: 16, background: '#F7F7F8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: tone, marginBottom: 10 }}>
        <Icon size={18} strokeWidth={2} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
      <strong style={{ fontFamily: 'Space Grotesk', fontSize: 30, fontWeight: 600 }}>{value}</strong>
    </div>
  );
}

function workerLabel(worker) {
  if (worker.nodeState === 'ACTIVE_IDLE') return 'Đang chờ / Idle Saver';
  if (!worker.online) return 'Offline';
  if (worker.nodeState === 'BUSY') return 'Đang render';
  if (worker.nodeState === 'PREPARING') return 'Đang chuẩn bị';
  if (worker.nodeState === 'RECOVERY') return 'Đang khôi phục';
  return 'Online';
}

/** Admin MVP: chỉ hiển thị trạng thái fleet Worker thật từ GET /fleet/workers. */
export default function AdminScreen() {
  const [staffToken, setStaffToken] = useState('');
  const [workers, setWorkers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadWorkers = useCallback((token) => {
    setIsLoading(true);
    setError(null);
    Promise.all([adminListWorkers(token), adminListCustomers(token)])
      .then(([nextWorkers, nextCustomers]) => {
        setWorkers(nextWorkers);
        setCustomers(nextCustomers);
      })
      .catch((err) => setError(err.message || 'Không tải được trạng thái Worker'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (staffToken) loadWorkers(staffToken);
  }, [staffToken, loadWorkers]);

  const metrics = useMemo(() => {
    const online = workers.filter((worker) => worker.online);
    return {
      total: workers.length,
      online: online.length,
      offline: workers.length - online.length,
      idleSaver: online.filter((worker) => worker.nodeState === 'ACTIVE_IDLE').length,
      rendering: online.filter((worker) => worker.nodeState === 'BUSY').length,
    };
  }, [workers]);

  const handleSignOut = useCallback(() => {
    setStaffToken('');
    setWorkers([]);
    setCustomers([]);
    signOutStaff().catch(() => {});
  }, []);

  if (!staffToken) return <StaffMfaLogin onAuthenticated={setStaffToken} />;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 600, margin: 0 }}>Worker Fleet</h1>
          <p style={{ color: '#6B6B70', fontSize: 14, margin: '6px 0 0' }}>Trạng thái máy xử lý CWS</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => loadWorkers(staffToken)} type="button" aria-label="Tải lại trạng thái Worker">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleSignOut} type="button" aria-label="Đăng xuất">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {error && <p style={{ color: '#C62828', fontSize: 14 }}>{error}</p>}
      {isLoading && <p style={{ color: '#6B6B70', fontSize: 14 }}>Đang tải trạng thái fleet...</p>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <Metric label="Tổng Worker" value={metrics.total} icon={Wifi} tone="#3B5BFF" />
        <Metric label="Online" value={metrics.online} icon={Wifi} tone="#2E7D32" />
        <Metric label="Offline" value={metrics.offline} icon={WifiOff} tone="#C62828" />
        <Metric label="Đang chờ / Idle Saver" value={metrics.idleSaver} icon={Moon} tone="#8E5CF6" />
        <Metric label="Đang Render" value={metrics.rendering} icon={Zap} tone="#E67700" />
      </div>

      <div style={{ border: '1px solid #E8E8EA', borderRadius: 16, overflow: 'hidden' }}>
        {workers.map((worker) => (
          <div key={worker.workerId} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '14px 16px', borderBottom: '1px solid #F0F0F1' }}>
            <div>
              <strong style={{ fontSize: 14 }}>{worker.workerId}</strong>
              <p style={{ color: '#6B6B70', fontSize: 12, margin: '4px 0 0' }}>{worker.gpuName || 'GPU chưa khai báo'}</p>
            </div>
            <span style={{ alignSelf: 'center', color: worker.online ? '#2E7D32' : '#C62828', fontSize: 13, fontWeight: 600 }}>
              {workerLabel(worker)}
            </span>
          </div>
        ))}
        {!isLoading && workers.length === 0 && (
          <p style={{ color: '#6B6B70', fontSize: 14, padding: 16, margin: 0 }}>Chưa có Worker nào trong fleet.</p>
        )}
      </div>

      <section style={{ marginTop: 28 }} aria-labelledby="customer-crm-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <UserRound size={18} color="#3B5BFF" />
          <h2 id="customer-crm-title" style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600, margin: 0 }}>Customer CRM</h2>
        </div>
        <div style={{ border: '1px solid #E8E8EA', borderRadius: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#F7F7F8', textAlign: 'left' }}>
                {['Khách hàng', 'Đăng ký', 'Hoạt động gần nhất', 'Job', 'Hoàn thành', 'Đã thanh toán', 'Job gần nhất', 'Trạng thái'].map((label) => (
                  <th key={label} style={{ padding: '11px 12px', fontSize: 12, color: '#6B6B70', fontWeight: 600 }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} style={{ borderTop: '1px solid #F0F0F1' }}>
                  <td style={{ padding: '12px', fontSize: 13 }}><strong>{customer.fullName || 'Chưa có tên'}</strong><br /><span style={{ color: '#6B6B70' }}>{customer.email || 'Chưa có email'}</span></td>
                  <td style={{ padding: '12px', fontSize: 12 }}>{new Date(customer.registeredAt).toLocaleDateString('vi-VN')}</td>
                  <td style={{ padding: '12px', fontSize: 12 }}>{new Date(customer.lastActiveAt).toLocaleDateString('vi-VN')}</td>
                  <td style={{ padding: '12px', fontSize: 13 }}>{customer.totalJobs}</td>
                  <td style={{ padding: '12px', fontSize: 13 }}>{customer.completedJobs}</td>
                  <td style={{ padding: '12px', fontSize: 13 }}>{customer.totalPaidVnd.toLocaleString('vi-VN')}đ</td>
                  <td style={{ padding: '12px', fontSize: 12 }}>{customer.latestJob ? `${customer.latestJob.id.slice(0, 8)} · ${customer.latestJob.status}` : '—'}</td>
                  <td style={{ padding: '12px', fontSize: 12 }}>{customer.lifecycleStatus === 'new' ? 'Mới' : customer.lifecycleStatus === 'returning' ? 'Khách quay lại' : 'Đã từng render'}</td>
                </tr>
              ))}
              {!isLoading && customers.length === 0 && <tr><td colSpan="8" style={{ padding: 16, color: '#6B6B70', fontSize: 14 }}>Chưa có khách hàng.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
