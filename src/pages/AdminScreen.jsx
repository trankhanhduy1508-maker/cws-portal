import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, LogOut, Eye, X } from 'lucide-react';
import {
  adminListCustomers, adminListJobs, adminListWorkers, adminListIncidents, adminListHostUsageSessions,
  adminRetryTask, adminRequeueTask, adminSetWorkerQuarantine, adminSetWorkerDrain,
  adminConfirmHostUsageFinalAmount,
  adminGetJobByStorageCode, adminGetPaymentByCode, adminGetJobPreview, adminGetDownloadUrl,
  adminListPaymentDevices, adminListPaymentAnomalies,
  adminListEditRequests, adminUpdateEditRequest,
  adminListSupportTickets, adminUpdateSupportTicket,
} from '../services/adminApi';
import { signOutStaff } from '../services/staffAuth';
import StaffMfaLogin from '../components/StaffMfaLogin';
import { JOB_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../constants/renderConstants';
import { formatRelativeTime } from '../utils/timeUtils';

const STAFF_TOKEN_STORAGE = 'cws_staff_token';

// Phase 8 CWS_WORKER_ROADMAP.md — hiển thị giây dạng "Xp Ys" ngắn gọn cho
// bảng thống kê host usage (số giây thô từ Backend khó đọc trực tiếp).
// Payment/refund safety net (2026-08-03, DECISIONS.md "Payment
// reconciliation") — nhãn tiếng Việt cho 3 loại bất thường của view
// payment_reconciliation_anomalies (xem worker_migrations/015_...).
const ANOMALY_TYPE_LABEL = {
  PAID_WITHOUT_PAYMENT_RECORD: 'Order "paid" nhưng thiếu dòng payments',
  NOTIFICATION_STUCK_PROCESSING: 'Webhook kẹt "processing" >10 phút',
  PAID_NOT_DELIVERED: 'Đã thanh toán >2 tiếng nhưng chưa nhận file',
};

function formatDurationSeconds(totalSeconds) {
  const s = Math.round(totalSeconds ?? 0);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return minutes > 0 ? `${minutes}p ${seconds}s` : `${seconds}s`;
}

/**
 * Dashboard Admin (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7) — KHÔNG nằm
 * trong luồng khách hàng bình thường, chỉ truy cập qua URL kèm
 * #admin (xem App.jsx). Bảo vệ bằng x-admin-key (shared secret đơn
 * giản, xem backend/src/common/guards/admin-key.guard.ts) — KHÔNG
 * phải hệ thống đăng nhập/phân quyền enterprise.
 */
export default function AdminScreen() {
  // adminKey giờ giữ ACCESS TOKEN Supabase (Bearer) thay vì shared key
  // tĩnh cũ — chỉ có giá trị SAU KHI đăng nhập + MFA thật thành công
  // (xem StaffMfaLogin/services/staffAuth.js). Đọc lại từ sessionStorage
  // lúc mount CHỈ để tránh hiện lại màn login khi user F5 trong CÙNG
  // tab — Backend vẫn tự kiểm tra lại claim aal của chính token này ở
  // MỌI request (không tin tưởng việc token có mặt là đủ).
  const [adminKey, setAdminKey] = useState(() => {
    try { return sessionStorage.getItem(STAFF_TOKEN_STORAGE) || ''; } catch { return ''; }
  });
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState('all');
  const [incidentShowResolved, setIncidentShowResolved] = useState(false);
  const [hostUsageSessions, setHostUsageSessions] = useState([]);
  const [paymentDevices, setPaymentDevices] = useState([]);
  const [paymentAnomalies, setPaymentAnomalies] = useState([]);
  const [editRequests, setEditRequests] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [storageCodeQuery, setStorageCodeQuery] = useState('');
  const [paymentCodeQuery, setPaymentCodeQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [previewJob, setPreviewJob] = useState(null); // { id, projectName, images, isLoading, error }

  const loadAll = useCallback((key) => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      adminListJobs(key), adminListCustomers(key), adminListWorkers(key),
      adminListIncidents(key), adminListHostUsageSessions(key), adminListPaymentDevices(key),
      adminListPaymentAnomalies(key), adminListEditRequests(key), adminListSupportTickets(key),
    ])
      .then(([jobsRes, customersRes, workersRes, incidentsRes, hostUsageRes, paymentDevicesRes, paymentAnomaliesRes, editRequestsRes, supportTicketsRes]) => {
        setJobs(jobsRes);
        setCustomers(customersRes);
        setWorkers(workersRes);
        setIncidents(incidentsRes);
        setHostUsageSessions(hostUsageRes);
        setPaymentDevices(paymentDevicesRes);
        setPaymentAnomalies(paymentAnomaliesRes);
        setEditRequests(editRequestsRes.requests ?? []);
        setSupportTickets(supportTicketsRes.tickets ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  // Hành động Admin THẬT lên Worker Fleet (retry/requeue/quarantine/drain,
  // ngoài CWS_WORKER_ROADMAP.md — đóng lỗ hổng Phase 6) — confirm() trước
  // khi gọi vì đây là thay đổi trạng thái thật (không chỉ đọc), rồi
  // loadAll() lại để bảng cập nhật đúng dữ liệu mới nhất.
  const runAdminAction = useCallback((confirmMessage, actionPromise) => {
    if (!window.confirm(confirmMessage)) return;
    setError(null);
    actionPromise
      .then((result) => {
        // Backend tra ve { ok: false } (HTTP 200 binh thuong, khong throw)
        // khi RPC tu choi vi dieu kien khong dung (vd retry task chua o
        // trang thai failed) - neu khong kiem tra rieng, Admin se KHONG
        // biet hanh dong vua bam co that su co tac dung hay khong.
        if (result && result.ok === false) {
          setError('Hành động không có tác dụng — điều kiện không đúng (ví dụ task/worker đã đổi trạng thái từ trước). Kiểm tra lại dữ liệu bên dưới.');
        }
        return loadAll(adminKey);
      })
      .catch((err) => setError(err.message));
  }, [adminKey, loadAll]);

  const handleRetryTask = useCallback((taskId) => {
    runAdminAction(`Retry task ${taskId}?`, adminRetryTask(taskId, adminKey));
  }, [adminKey, runAdminAction]);

  const handleRequeueTask = useCallback((taskId) => {
    runAdminAction(`Requeue task ${taskId} ngay (không đợi tự động)?`, adminRequeueTask(taskId, adminKey));
  }, [adminKey, runAdminAction]);

  const handleToggleQuarantine = useCallback((workerId, currentlyQuarantined) => {
    const next = !currentlyQuarantined;
    runAdminAction(
      next ? `Quarantine worker ${workerId}? Worker sẽ không claim được task mới.` : `Bỏ quarantine worker ${workerId}?`,
      adminSetWorkerQuarantine(workerId, next, null, adminKey),
    );
  }, [adminKey, runAdminAction]);

  const handleToggleDrain = useCallback((workerId, currentlyDraining) => {
    const next = !currentlyDraining;
    runAdminAction(
      next ? `Drain worker ${workerId}? Worker sẽ hoàn tất task hiện tại nhưng không nhận task mới.` : `Bỏ drain worker ${workerId}?`,
      adminSetWorkerDrain(workerId, next, null, adminKey),
    );
  }, [adminKey, runAdminAction]);

  const handleSupportTicketStatus = useCallback((ticketId, status) => {
    setError(null);
    adminUpdateSupportTicket(ticketId, status, adminKey)
      .then(() => loadAll(adminKey))
      .catch((err) => setError(err.message));
  }, [adminKey, loadAll]);

  const handleEditRequestStatus = useCallback((requestId, status) => {
    setError(null);
    adminUpdateEditRequest(requestId, status, adminKey)
      .then(() => loadAll(adminKey))
      .catch((err) => setError(err.message));
  }, [adminKey, loadAll]);

  const handleConfirmFinalAmount = useCallback((sessionId, estimatedAmount) => {
    const input = window.prompt(
      'Nhập số tiền cuối cùng (VND):',
      estimatedAmount != null ? String(estimatedAmount) : '',
    );
    // Number('') === 0 trong JS - neu khong chan rieng, bam OK voi o
    // trong (thuong xay ra vi estimatedAmount dang null khi chua cau
    // hinh hourly_rate) se AM THAM xac nhan final_amount=0, de bi nham
    // la "co chu dich, khong tinh tien" trong khi thuc ra la bo trong.
    if (input == null || input.trim() === '') return; // Cancel hoặc để trống
    const finalAmount = Number(input);
    if (!Number.isFinite(finalAmount) || finalAmount < 0) {
      setError('Số tiền không hợp lệ');
      return;
    }
    setError(null);
    adminConfirmHostUsageFinalAmount(sessionId, finalAmount, adminKey)
      .then((result) => {
        if (result && result.ok === false) {
          setError('Không xác nhận được final_amount — phiên host usage có thể không còn tồn tại.');
        }
        return loadAll(adminKey);
      })
      .catch((err) => setError(err.message));
  }, [adminKey, loadAll]);

  // Phase 6 CWS_WORKER_ROADMAP.md — lọc theo severity/đã xử lý ngay ở
  // Frontend (danh sách tối đa 200 dòng gần nhất từ Backend, không cần
  // gọi lại API mỗi lần đổi filter).
  const filteredIncidents = useMemo(() => (
    incidents.filter((inc) => {
      if (incidentSeverityFilter !== 'all' && inc.severity !== incidentSeverityFilter) return false;
      if (!incidentShowResolved && inc.resolvedAt) return false;
      return true;
    })
  ), [incidents, incidentSeverityFilter, incidentShowResolved]);

  const handleDownloadJob = useCallback(async (jobId) => {
    setError(null);
    try {
      const objectUrl = await adminGetDownloadUrl(jobId, adminKey);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      setError(err.message);
    }
  }, [adminKey]);

  const handleOpenPreview = useCallback((job) => {
    setPreviewJob({ id: job.id, projectName: job.projectName, images: [], isLoading: true, error: null });
    adminGetJobPreview(job.id, adminKey)
      .then((res) => setPreviewJob((p) => (p && p.id === job.id ? { ...p, images: res.images ?? [], isLoading: false } : p)))
      .catch((err) => setPreviewJob((p) => (p && p.id === job.id ? { ...p, isLoading: false, error: err.message } : p)));
  }, [adminKey]);

  useEffect(() => {
    if (adminKey) loadAll(adminKey);
  }, [adminKey, loadAll]);

  // customerId -> tên hiển thị — dùng để hiện tên khách ở bảng Job thay
  // vì UUID trần, và để lọc Job theo Customer (Giai đoạn 7: "Tìm kiếm
  // theo Customer").
  const customerNameById = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => map.set(c.id, c.fullName || c.email || c.id));
    return map;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      (c.fullName || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  }, [customers, customerQuery]);

  const visibleJobs = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return jobs;
    const matchingCustomerIds = new Set(filteredCustomers.map((c) => c.id));
    return jobs.filter((job) => job.customerId && matchingCustomerIds.has(job.customerId));
  }, [jobs, customerQuery, filteredCustomers]);

  const handleAuthenticated = useCallback((accessToken) => {
    try { sessionStorage.setItem(STAFF_TOKEN_STORAGE, accessToken); } catch { /* ignore */ }
    setAdminKey(accessToken);
  }, []);

  const handleSignOut = useCallback(() => {
    try { sessionStorage.removeItem(STAFF_TOKEN_STORAGE); } catch { /* ignore */ }
    setAdminKey('');
    signOutStaff().catch(() => { /* đã xoá token local, không chặn UI vì lỗi mạng */ });
  }, []);

  const handleSearchStorageCode = async (e) => {
    e.preventDefault();
    if (!storageCodeQuery.trim()) return;
    setError(null);
    try {
      const result = await adminGetJobByStorageCode(storageCodeQuery.trim(), adminKey);
      setSearchResult({ type: 'job', data: result });
    } catch (err) {
      setError(err.message);
      setSearchResult(null);
    }
  };

  const handleSearchPaymentCode = async (e) => {
    e.preventDefault();
    if (!paymentCodeQuery.trim()) return;
    setError(null);
    try {
      const result = await adminGetPaymentByCode(paymentCodeQuery.trim(), adminKey);
      setSearchResult({ type: 'payment', data: result });
    } catch (err) {
      setError(err.message);
      setSearchResult(null);
    }
  };

  if (!adminKey) {
    return <StaffMfaLogin onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600 }}>CWS Admin</h2>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <button onClick={() => loadAll(adminKey)} type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#3B5BFF' }}>
            <RefreshCw size={14} strokeWidth={2} /> Tải lại
          </button>
          <button onClick={handleSignOut} type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#666' }}>
            <LogOut size={14} strokeWidth={2} /> Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchStorageCode} style={{ display: 'flex', gap: 6, flex: 1, minWidth: 220 }}>
          <input
            value={storageCodeQuery}
            onChange={(e) => setStorageCodeQuery(e.target.value)}
            placeholder="Tìm theo Storage Code (CWS-XXXXXXXX)"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #E8E8EA', fontSize: 13.5 }}
          />
          <button type="submit" style={{ padding: '10px 12px' }}><Search size={16} strokeWidth={2} /></button>
        </form>
        <form onSubmit={handleSearchPaymentCode} style={{ display: 'flex', gap: 6, flex: 1, minWidth: 220 }}>
          <input
            value={paymentCodeQuery}
            onChange={(e) => setPaymentCodeQuery(e.target.value)}
            placeholder="Tìm theo Payment Code"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #E8E8EA', fontSize: 13.5 }}
          />
          <button type="submit" style={{ padding: '10px 12px' }}><Search size={16} strokeWidth={2} /></button>
        </form>
        <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 220 }}>
          <input
            value={customerQuery}
            onChange={(e) => setCustomerQuery(e.target.value)}
            placeholder="Tìm theo Customer (tên/email/id)"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #E8E8EA', fontSize: 13.5 }}
          />
        </div>
      </div>

      {error && <p style={{ color: '#E5484D', fontSize: 13.5, marginBottom: 12 }}>{error}</p>}

      {searchResult && (
        <pre style={{
          background: '#F7F7F8', padding: 14, borderRadius: 12, fontSize: 12.5,
          overflowX: 'auto', marginBottom: 20,
        }}>
          {JSON.stringify(searchResult.data, null, 2)}
        </pre>
      )}

      {isLoading && <p>Đang tải...</p>}

      {!isLoading && (
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                <th style={{ padding: 8 }}>Project</th>
                <th style={{ padding: 8 }}>Customer</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Tiến độ</th>
                <th style={{ padding: 8 }}>Payment</th>
                <th style={{ padding: 8 }}>Tạo lúc</th>
                <th style={{ padding: 8 }}>File cuối</th>
                <th style={{ padding: 8 }}>Preview</th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                  <td style={{ padding: 8 }}>{job.projectName}</td>
                  <td style={{ padding: 8 }}>{job.customerId ? (customerNameById.get(job.customerId) ?? job.customerId) : '—'}</td>
                  <td style={{ padding: 8 }}>{JOB_STATUS_LABEL[job.status] ?? job.status}</td>
                  <td style={{ padding: 8 }}>{Math.round((job.stageProgress ?? 0) * 100)}%</td>
                  <td style={{ padding: 8 }}>{PAYMENT_STATUS_LABEL[job.paymentStatus] ?? job.paymentStatus}</td>
                  <td style={{ padding: 8 }}>{formatRelativeTime(job.createdAt)}</td>
                  <td style={{ padding: 8 }}>
                    {job.downloadUrl ? (
                      <button type="button" onClick={() => handleDownloadJob(job.id)} style={{ border: 0, background: 'none', color: '#2563EB', cursor: 'pointer', padding: 0 }}>Tải</button>
                    ) : '—'}
                  </td>
                  <td style={{ padding: 8 }}>
                    <button
                      onClick={() => handleOpenPreview(job)}
                      type="button"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: '#3B5BFF' }}
                    >
                      <Eye size={13} strokeWidth={2} /> Xem
                    </button>
                  </td>
                </tr>
              ))}
              {visibleJobs.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Chưa có job nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {previewJob && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
          }}
          onClick={() => setPreviewJob(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: 20, maxWidth: 640, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 15, fontWeight: 600 }}>
                Preview — {previewJob.projectName}
              </h3>
              <button onClick={() => setPreviewJob(null)} type="button" style={{ padding: 4 }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            {previewJob.isLoading && <p style={{ fontSize: 13.5, color: '#6B6B70' }}>Đang tải...</p>}
            {previewJob.error && <p style={{ fontSize: 13.5, color: '#E5484D' }}>{previewJob.error}</p>}
            {!previewJob.isLoading && !previewJob.error && previewJob.images.length === 0 && (
              <p style={{ fontSize: 13.5, color: '#9a9aa0' }}>Job này chưa có ảnh preview (chưa tới bước review_ready).</p>
            )}
            {previewJob.images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                {previewJob.images
                  .slice()
                  .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                  .map((img, i) => (
                    <img
                      key={img.url + i}
                      src={img.url}
                      alt={`Preview ${i + 1}`}
                      style={{ width: '100%', borderRadius: 10, aspectRatio: '16 / 9', objectFit: 'cover' }}
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            Bất thường thanh toán / refund
          </h3>
          {/* Payment/refund safety net (2026-08-03, DECISIONS.md "Payment
              reconciliation") — CHỈ đọc, view payment_reconciliation_anomalies
              (worker_migrations/015_...) là nguồn sự thật duy nhất, Frontend
              KHÔNG tự tính lại logic phát hiện. Đặt NGAY SAU bảng Job (trước
              Worker Fleet) vì đây là rủi ro trực tiếp tới khách/tiền — ưu
              tiên hiển thị cao hơn tình trạng hạ tầng Worker. */}
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Loại</th>
                  <th style={{ padding: 8 }}>Order / Storage Code</th>
                  <th style={{ padding: 8 }}>Order status</th>
                  <th style={{ padding: 8 }}>Payment status</th>
                  <th style={{ padding: 8 }}>Số tiền</th>
                  <th style={{ padding: 8 }}>Thời điểm mốc</th>
                </tr>
              </thead>
              <tbody>
                {paymentAnomalies.map((a, i) => (
                  <tr key={`${a.orderId}-${a.anomalyType}-${i}`} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8, color: '#E5484D', fontWeight: 500 }}>
                      {ANOMALY_TYPE_LABEL[a.anomalyType] ?? a.anomalyType}
                    </td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{a.storageCode ?? a.orderId}</td>
                    <td style={{ padding: 8 }}>{a.orderStatus ? (JOB_STATUS_LABEL[a.orderStatus] ?? a.orderStatus) : '—'}</td>
                    <td style={{ padding: 8 }}>{a.paymentStatus ? (PAYMENT_STATUS_LABEL[a.paymentStatus] ?? a.paymentStatus) : '—'}</td>
                    <td style={{ padding: 8 }}>{a.amountVnd != null ? a.amountVnd.toLocaleString('vi-VN') : '—'}</td>
                    <td style={{ padding: 8 }}>{formatRelativeTime(a.referenceTime)}</td>
                  </tr>
                ))}
                {paymentAnomalies.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Không có bất thường nào — dữ liệu thanh toán khớp bình thường</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            Worker Fleet
          </h3>
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Worker ID</th>
                  <th style={{ padding: 8 }}>GPU</th>
                  <th style={{ padding: 8 }}>Status</th>
                  {/* Phase 5 CWS_WORKER_ROADMAP.md: cot chi tiet hon o BEN
                      CANH "Status" (idle/busy/offline, van la nguon su that
                      chinh) - null neu Worker dang chay ban cu chua co
                      tinh nang bao cao observed_state (Phase 3). */}
                  <th style={{ padding: 8 }}>Trạng thái chi tiết</th>
                  <th style={{ padding: 8 }}>Last seen</th>
                  <th style={{ padding: 8 }}>Crash count</th>
                  <th style={{ padding: 8 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => {
                  const isQuarantined = w.healthState === 'QUARANTINED';
                  const isDraining = w.desiredState === 'DRAINING';
                  return (
                    <tr key={w.workerId} style={{ borderBottom: '1px solid #F0F0F1' }}>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{w.workerId}</td>
                      <td style={{ padding: 8 }}>{w.gpuName ?? '—'}</td>
                      <td style={{ padding: 8 }}>{w.status}</td>
                      <td style={{ padding: 8 }} title={w.stateReason ?? ''}>
                        {w.observedState ?? '—'}
                        {w.lastTransitionAt ? ` (${formatRelativeTime(w.lastTransitionAt)})` : ''}
                      </td>
                      <td style={{ padding: 8 }}>{formatRelativeTime(w.lastSeenAt)}</td>
                      <td style={{ padding: 8 }}>{w.crashCount}</td>
                      <td style={{ padding: 8, display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleToggleQuarantine(w.workerId, isQuarantined)}
                          style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #E8E8EA', background: isQuarantined ? '#FEE2E2' : '#fff', cursor: 'pointer' }}
                        >
                          {isQuarantined ? 'Bỏ quarantine' : 'Quarantine'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleDrain(w.workerId, isDraining)}
                          style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #E8E8EA', background: isDraining ? '#FEF3C7' : '#fff', cursor: 'pointer' }}
                        >
                          {isDraining ? 'Bỏ drain' : 'Drain'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {workers.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Chưa có Worker nào</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, margin: 0 }}>
              Sự cố Worker Fleet
            </h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
              <select
                value={incidentSeverityFilter}
                onChange={(e) => setIncidentSeverityFilter(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E8E8EA' }}
              >
                <option value="all">Mọi mức độ</option>
                <option value="critical">critical</option>
                <option value="error">error</option>
                <option value="warning">warning</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={incidentShowResolved}
                  onChange={(e) => setIncidentShowResolved(e.target.checked)}
                />
                Hiện cả đã xử lý
              </label>
            </div>
          </div>
          {/* Phase 6 CWS_WORKER_ROADMAP.md — CHỈ đọc (worker_incidents qua
              RPC report_worker_incident(), xem worker_migrations/004_...).
              Hiện tại chỉ có WORKER_CRASH (tự động, mở rộng từ
              report_worker_crash() có sẵn) và MERGE_FAIL (Worker tự gọi khi
              attempt_job_video_merge() lỗi) — các loại lỗi khác trong roadmap
              (GPU/CPU quá nhiệt, disk full...) CHƯA có code phát hiện, sẽ
              không xuất hiện ở đây cho tới khi được làm ở vòng sau. Nút
              Retry/Requeue gọi RPC tương ứng — RPC tự kiểm tra điều kiện
              (retry chỉ hoạt động nếu task đang failed, requeue chỉ nếu
              đang active), bấm sai điều kiện chỉ trả về không thành công,
              không gây hại gì thêm. */}
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Gần nhất</th>
                  <th style={{ padding: 8 }}>Worker</th>
                  <th style={{ padding: 8 }}>Task</th>
                  <th style={{ padding: 8 }}>Loại</th>
                  <th style={{ padding: 8 }}>Mức độ</th>
                  <th style={{ padding: 8 }}>Số lần</th>
                  <th style={{ padding: 8 }}>Tóm tắt</th>
                  <th style={{ padding: 8 }}>Trạng thái</th>
                  <th style={{ padding: 8 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8 }}>{formatRelativeTime(inc.lastSeenAt)}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{inc.workerId ?? '—'}</td>
                    <td style={{ padding: 8 }}>{inc.taskId ?? '—'}</td>
                    <td style={{ padding: 8 }}>{inc.eventType}</td>
                    <td style={{ padding: 8 }}>{inc.severity}</td>
                    <td style={{ padding: 8 }}>{inc.occurrenceCount}</td>
                    <td style={{ padding: 8, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inc.summary}>
                      {inc.summary}
                    </td>
                    <td style={{ padding: 8 }}>{inc.resolvedAt ? 'Đã xử lý' : 'Chưa xử lý'}</td>
                    <td style={{ padding: 8, display: 'flex', gap: 6 }}>
                      {inc.taskId != null && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRetryTask(inc.taskId)}
                            style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #E8E8EA', background: '#fff', cursor: 'pointer' }}
                          >
                            Retry
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequeueTask(inc.taskId)}
                            style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #E8E8EA', background: '#fff', cursor: 'pointer' }}
                          >
                            Requeue
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredIncidents.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Không có sự cố nào khớp bộ lọc</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            Yêu cầu hỗ trợ của khách
          </h3>
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Mã</th>
                  <th style={{ padding: 8 }}>Customer</th>
                  <th style={{ padding: 8 }}>Job</th>
                  <th style={{ padding: 8 }}>Chủ đề/nội dung</th>
                  <th style={{ padding: 8 }}>Trạng thái</th>
                  <th style={{ padding: 8 }}>Tạo lúc</th>
                  <th style={{ padding: 8 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {supportTickets.map((ticket) => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{ticket.ticketCode}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{ticket.customerId}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{ticket.jobId ?? '—'}</td>
                    <td style={{ padding: 8, maxWidth: 320 }}>
                      <strong>{ticket.subject}</strong>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.message}</div>
                    </td>
                    <td style={{ padding: 8 }}>{ticket.status}</td>
                    <td style={{ padding: 8 }}>{formatRelativeTime(ticket.createdAt)}</td>
                    <td style={{ padding: 8 }}>
                      <select
                        value={ticket.status}
                        onChange={(e) => handleSupportTicketStatus(ticket.id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E8E8EA' }}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="DECLINED">DECLINED</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {supportTickets.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Chưa có support ticket</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            Yêu cầu chỉnh sửa của khách
          </h3>
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Job</th>
                  <th style={{ padding: 8 }}>Khách yêu cầu</th>
                  <th style={{ padding: 8 }}>Ghi chú</th>
                  <th style={{ padding: 8 }}>Trạng thái</th>
                  <th style={{ padding: 8 }}>Tạo lúc</th>
                  <th style={{ padding: 8 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {editRequests.map((request) => (
                  <tr key={request.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{request.jobId}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{request.requestedBy}</td>
                    <td style={{ padding: 8, maxWidth: 320, whiteSpace: 'pre-wrap' }}>{request.note ?? '—'}</td>
                    <td style={{ padding: 8 }}>{request.status}</td>
                    <td style={{ padding: 8 }}>{formatRelativeTime(request.createdAt)}</td>
                    <td style={{ padding: 8 }}>
                      <select
                        value={request.status}
                        onChange={(e) => handleEditRequestStatus(request.id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E8E8EA' }}
                      >
                        <option value="REQUESTED">REQUESTED</option>
                        <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="DECLINED">DECLINED</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {editRequests.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Chưa có yêu cầu chỉnh sửa</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            Thống kê thời gian thuê host
          </h3>
          {/* Phase 8 CWS_WORKER_ROADMAP.md — CHỈ đọc (host_usage_sessions,
              tính bởi RPC compute_host_usage_sessions() qua cron 5 phút/lần,
              xem worker_migrations/006_host_usage_billing.sql). "Ước tính"
              để trống (—) khi status=awaiting_rate (fleets.hourly_rate chưa
              được cấu hình) — KHÔNG hiện 0 để tránh hiểu lầm miễn phí.
              status=decision_required nghĩa là khởi động vượt quá 7 phút
              (420s), cần Admin xem xét thủ công (roadmap chưa quy định tự
              động xử lý trường hợp này). "Số tiền cuối" — nút "Xác nhận"
              hỏi số tiền qua prompt() (tiền tệ đơn giản, dashboard nội bộ
              không cần form phức tạp), gọi RPC admin_confirm_host_usage_final_amount()
              — hành động DUY NHẤT ghi final_amount, Worker/hệ thống tự
              động không bao giờ tự quyết định số này. */}
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Lúc</th>
                  <th style={{ padding: 8 }}>Worker</th>
                  <th style={{ padding: 8 }}>Task</th>
                  <th style={{ padding: 8 }}>Khởi động</th>
                  <th style={{ padding: 8 }}>Render</th>
                  <th style={{ padding: 8 }}>Upload</th>
                  <th style={{ padding: 8 }}>Billable</th>
                  <th style={{ padding: 8 }}>Ước tính</th>
                  <th style={{ padding: 8 }}>Số tiền cuối</th>
                  <th style={{ padding: 8 }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {hostUsageSessions.map((hu) => (
                  <tr key={hu.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8 }}>{formatRelativeTime(hu.createdAt)}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{hu.workerId ?? '—'}</td>
                    <td style={{ padding: 8 }}>{hu.taskId ?? '—'}</td>
                    <td style={{ padding: 8 }} title={`Ngưỡng miễn tính: ${formatDurationSeconds(hu.startupGraceSeconds)}`}>
                      {formatDurationSeconds(hu.startupSeconds)}
                    </td>
                    <td style={{ padding: 8 }}>{formatDurationSeconds(hu.renderSeconds)}</td>
                    <td style={{ padding: 8 }}>{formatDurationSeconds(hu.uploadSeconds)}</td>
                    <td style={{ padding: 8 }}>{formatDurationSeconds(hu.billableSeconds)}</td>
                    <td style={{ padding: 8 }}>
                      {hu.estimatedAmount != null ? hu.estimatedAmount.toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ padding: 8 }}>
                      {hu.finalAmount != null ? (
                        hu.finalAmount.toLocaleString('vi-VN')
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmFinalAmount(hu.id, hu.estimatedAmount)}
                          style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #E8E8EA', background: '#fff', cursor: 'pointer' }}
                        >
                          Xác nhận
                        </button>
                      )}
                    </td>
                    <td style={{ padding: 8 }}>{hu.status}</td>
                  </tr>
                ))}
                {hostUsageSessions.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Chưa có phiên nào hoàn thành</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            Khách hàng
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Tên</th>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>ID</th>
                  <th style={{ padding: 8 }}>Tham gia lúc</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8 }}>{c.fullName ?? '—'}</td>
                    <td style={{ padding: 8 }}>{c.email ?? '—'}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{c.id}</td>
                    <td style={{ padding: 8 }}>{formatRelativeTime(c.createdAt)}</td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Chưa có khách hàng nào</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10, marginTop: 28 }}>
            Thiết bị thanh toán (MBBank Notification Listener)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Thiết bị</th>
                  <th style={{ padding: 8 }}>Trạng thái</th>
                  <th style={{ padding: 8 }}>Model</th>
                  <th style={{ padding: 8 }}>App version</th>
                  <th style={{ padding: 8 }}>Heartbeat cuối</th>
                  <th style={{ padding: 8 }}>Thông báo gần nhất</th>
                  <th style={{ padding: 8 }}>Lỗi gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {paymentDevices.map((d) => {
                  const isOnline = d.lastHeartbeatAt && Date.now() - d.lastHeartbeatAt < 2 * 60 * 1000;
                  return (
                    <tr key={d.deviceId} style={{ borderBottom: '1px solid #F0F0F1' }}>
                      <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{d.label ?? d.deviceId}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ color: isOnline ? '#1E9E5A' : '#9a9aa0' }}>
                          {isOnline ? '● Online' : '○ Offline'}
                        </span>
                        {!d.isActive && <span style={{ color: '#E5484D', marginLeft: 6 }}>(vô hiệu hoá)</span>}
                      </td>
                      <td style={{ padding: 8 }}>{[d.manufacturer, d.model].filter(Boolean).join(' ') || '—'}</td>
                      <td style={{ padding: 8 }}>{d.appVersion ?? '—'}</td>
                      <td style={{ padding: 8 }}>{d.lastHeartbeatAt ? formatRelativeTime(d.lastHeartbeatAt) : 'Chưa từng'}</td>
                      <td style={{ padding: 8 }}>{d.lastNotificationAt ? formatRelativeTime(d.lastNotificationAt) : 'Chưa từng'}</td>
                      <td style={{ padding: 8, color: d.lastError ? '#E5484D' : undefined }}>{d.lastError ?? '—'}</td>
                    </tr>
                  );
                })}
                {paymentDevices.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Chưa có thiết bị nào đăng ký</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
