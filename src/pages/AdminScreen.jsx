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
import AdminAffiliatePanel from '../components/AdminAffiliatePanel';
import { JOB_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../constants/renderConstants';
import { formatRelativeTime } from '../utils/timeUtils';

const STAFF_TOKEN_STORAGE = 'cws_staff_token';

// Phase 8 CWS_WORKER_ROADMAP.md â€” hiá»ƒn thá»‹ giÃ¢y dáº¡ng "Xp Ys" ngáº¯n gá»n cho
// báº£ng thá»‘ng kÃª host usage (sá»‘ giÃ¢y thÃ´ tá»« Backend khÃ³ Ä‘á»c trá»±c tiáº¿p).
// Payment/refund safety net (2026-08-03, DECISIONS.md "Payment
// reconciliation") â€” nhÃ£n tiáº¿ng Viá»‡t cho 3 loáº¡i báº¥t thÆ°á»ng cá»§a view
// payment_reconciliation_anomalies (xem worker_migrations/015_...).
const ANOMALY_TYPE_LABEL = {
  PAID_WITHOUT_PAYMENT_RECORD: 'Order "paid" nhÆ°ng thiáº¿u dÃ²ng payments',
  NOTIFICATION_STUCK_PROCESSING: 'Webhook káº¹t "processing" >10 phÃºt',
  PAID_NOT_DELIVERED: 'ÄÃ£ thanh toÃ¡n >2 tiáº¿ng nhÆ°ng chÆ°a nháº­n file',
};

function formatDateTimeLocal(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function formatDurationSeconds(totalSeconds) {
  const s = Math.round(totalSeconds ?? 0);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return minutes > 0 ? `${minutes}p ${seconds}s` : `${seconds}s`;
}

/**
 * Dashboard Admin (CWS_ROADMAP_MVP_V1.md, Giai Ä‘oáº¡n 7) â€” KHÃ”NG náº±m
 * trong luá»“ng khÃ¡ch hÃ ng bÃ¬nh thÆ°á»ng, chá»‰ truy cáº­p qua URL kÃ¨m
 * #admin (xem App.jsx). Báº£o vá»‡ báº±ng x-admin-key (shared secret Ä‘Æ¡n
 * giáº£n, xem backend/src/common/guards/admin-key.guard.ts) â€” KHÃ”NG
 * pháº£i há»‡ thá»‘ng Ä‘Äƒng nháº­p/phÃ¢n quyá»n enterprise.
 */
export default function AdminScreen() {
  // adminKey giá» giá»¯ ACCESS TOKEN Supabase (Bearer) thay vÃ¬ shared key
  // tÄ©nh cÅ© â€” chá»‰ cÃ³ giÃ¡ trá»‹ SAU KHI Ä‘Äƒng nháº­p + MFA tháº­t thÃ nh cÃ´ng
  // (xem StaffMfaLogin/services/staffAuth.js). Äá»c láº¡i tá»« sessionStorage
  // lÃºc mount CHá»ˆ Ä‘á»ƒ trÃ¡nh hiá»‡n láº¡i mÃ n login khi user F5 trong CÃ™NG
  // tab â€” Backend váº«n tá»± kiá»ƒm tra láº¡i claim aal cá»§a chÃ­nh token nÃ y á»Ÿ
  // Má»ŒI request (khÃ´ng tin tÆ°á»Ÿng viá»‡c token cÃ³ máº·t lÃ  Ä‘á»§).
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

  // HÃ nh Ä‘á»™ng Admin THáº¬T lÃªn Worker Fleet (retry/requeue/quarantine/drain,
  // ngoÃ i CWS_WORKER_ROADMAP.md â€” Ä‘Ã³ng lá»— há»•ng Phase 6) â€” confirm() trÆ°á»›c
  // khi gá»i vÃ¬ Ä‘Ã¢y lÃ  thay Ä‘á»•i tráº¡ng thÃ¡i tháº­t (khÃ´ng chá»‰ Ä‘á»c), rá»“i
  // loadAll() láº¡i Ä‘á»ƒ báº£ng cáº­p nháº­t Ä‘Ãºng dá»¯ liá»‡u má»›i nháº¥t.
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
          setError('HÃ nh Ä‘á»™ng khÃ´ng cÃ³ tÃ¡c dá»¥ng â€” Ä‘iá»u kiá»‡n khÃ´ng Ä‘Ãºng (vÃ­ dá»¥ task/worker Ä‘Ã£ Ä‘á»•i tráº¡ng thÃ¡i tá»« trÆ°á»›c). Kiá»ƒm tra láº¡i dá»¯ liá»‡u bÃªn dÆ°á»›i.');
        }
        return loadAll(adminKey);
      })
      .catch((err) => setError(err.message));
  }, [adminKey, loadAll]);

  const handleRetryTask = useCallback((taskId) => {
    runAdminAction(`Retry task ${taskId}?`, adminRetryTask(taskId, adminKey));
  }, [adminKey, runAdminAction]);

  const handleRequeueTask = useCallback((taskId) => {
    runAdminAction(`Requeue task ${taskId} ngay (khÃ´ng Ä‘á»£i tá»± Ä‘á»™ng)?`, adminRequeueTask(taskId, adminKey));
  }, [adminKey, runAdminAction]);

  const handleToggleQuarantine = useCallback((workerId, currentlyQuarantined) => {
    const next = !currentlyQuarantined;
    runAdminAction(
      next ? `Quarantine worker ${workerId}? Worker sáº½ khÃ´ng claim Ä‘Æ°á»£c task má»›i.` : `Bá» quarantine worker ${workerId}?`,
      adminSetWorkerQuarantine(workerId, next, null, adminKey),
    );
  }, [adminKey, runAdminAction]);

  const handleToggleDrain = useCallback((workerId, currentlyDraining) => {
    const next = !currentlyDraining;
    runAdminAction(
      next ? `Drain worker ${workerId}? Worker sáº½ hoÃ n táº¥t task hiá»‡n táº¡i nhÆ°ng khÃ´ng nháº­n task má»›i.` : `Bá» drain worker ${workerId}?`,
      adminSetWorkerDrain(workerId, next, null, adminKey),
    );
  }, [adminKey, runAdminAction]);

  const handleSupportTicketExpectedResponse = useCallback((ticket, value) => {
    const expectedResponseAt = value ? new Date(value).getTime() : null;
    if (value && !Number.isFinite(expectedResponseAt)) {
      setError('Thá»i gian pháº£n há»“i khÃ´ng há»£p lá»‡');
      return;
    }
    setError(null);
    adminUpdateSupportTicket(ticket.id, ticket.status, adminKey, expectedResponseAt)
      .then(() => loadAll(adminKey))
      .catch((err) => setError(err.message));
  }, [adminKey, loadAll]);

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
      'Nháº­p sá»‘ tiá»n cuá»‘i cÃ¹ng (VND):',
      estimatedAmount != null ? String(estimatedAmount) : '',
    );
    // Number('') === 0 trong JS - neu khong chan rieng, bam OK voi o
    // trong (thuong xay ra vi estimatedAmount dang null khi chua cau
    // hinh hourly_rate) se AM THAM xac nhan final_amount=0, de bi nham
    // la "co chu dich, khong tinh tien" trong khi thuc ra la bo trong.
    if (input == null || input.trim() === '') return; // Cancel hoáº·c Ä‘á»ƒ trá»‘ng
    const finalAmount = Number(input);
    if (!Number.isFinite(finalAmount) || finalAmount < 0) {
      setError('Sá»‘ tiá»n khÃ´ng há»£p lá»‡');
      return;
    }
    setError(null);
    adminConfirmHostUsageFinalAmount(sessionId, finalAmount, adminKey)
      .then((result) => {
        if (result && result.ok === false) {
          setError('KhÃ´ng xÃ¡c nháº­n Ä‘Æ°á»£c final_amount â€” phiÃªn host usage cÃ³ thá»ƒ khÃ´ng cÃ²n tá»“n táº¡i.');
        }
        return loadAll(adminKey);
      })
      .catch((err) => setError(err.message));
  }, [adminKey, loadAll]);

  // Phase 6 CWS_WORKER_ROADMAP.md â€” lá»c theo severity/Ä‘Ã£ xá»­ lÃ½ ngay á»Ÿ
  // Frontend (danh sÃ¡ch tá»‘i Ä‘a 200 dÃ²ng gáº§n nháº¥t tá»« Backend, khÃ´ng cáº§n
  // gá»i láº¡i API má»—i láº§n Ä‘á»•i filter).
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

  // customerId -> tÃªn hiá»ƒn thá»‹ â€” dÃ¹ng Ä‘á»ƒ hiá»‡n tÃªn khÃ¡ch á»Ÿ báº£ng Job thay
  // vÃ¬ UUID tráº§n, vÃ  Ä‘á»ƒ lá»c Job theo Customer (Giai Ä‘oáº¡n 7: "TÃ¬m kiáº¿m
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
    signOutStaff().catch(() => { /* Ä‘Ã£ xoÃ¡ token local, khÃ´ng cháº·n UI vÃ¬ lá»—i máº¡ng */ });
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
            <RefreshCw size={14} strokeWidth={2} /> Táº£i láº¡i
          </button>
          <button onClick={handleSignOut} type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#666' }}>
            <LogOut size={14} strokeWidth={2} /> ÄÄƒng xuáº¥t
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <form onSubmit={handleSearchStorageCode} style={{ display: 'flex', gap: 6, flex: 1, minWidth: 220 }}>
          <input
            value={storageCodeQuery}
            onChange={(e) => setStorageCodeQuery(e.target.value)}
            placeholder="TÃ¬m theo Storage Code (CWS-XXXXXXXX)"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #E8E8EA', fontSize: 13.5 }}
          />
          <button type="submit" style={{ padding: '10px 12px' }}><Search size={16} strokeWidth={2} /></button>
        </form>
        <form onSubmit={handleSearchPaymentCode} style={{ display: 'flex', gap: 6, flex: 1, minWidth: 220 }}>
          <input
            value={paymentCodeQuery}
            onChange={(e) => setPaymentCodeQuery(e.target.value)}
            placeholder="TÃ¬m theo Payment Code"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1.5px solid #E8E8EA', fontSize: 13.5 }}
          />
          <button type="submit" style={{ padding: '10px 12px' }}><Search size={16} strokeWidth={2} /></button>
        </form>
        <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 220 }}>
          <input
            value={customerQuery}
            onChange={(e) => setCustomerQuery(e.target.value)}
            placeholder="TÃ¬m theo Customer (tÃªn/email/id)"
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

      <AdminAffiliatePanel adminKey={adminKey} />

      {isLoading && <p>Äang táº£i...</p>}

      {!isLoading && (
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                <th style={{ padding: 8 }}>Project</th>
                <th style={{ padding: 8 }}>Customer</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Tiáº¿n Ä‘á»™</th>
                <th style={{ padding: 8 }}>Payment</th>
                <th style={{ padding: 8 }}>Táº¡o lÃºc</th>
                <th style={{ padding: 8 }}>File cuá»‘i</th>
                <th style={{ padding: 8 }}>Preview</th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                  <td style={{ padding: 8 }}>{job.projectName}</td>
                  <td style={{ padding: 8 }}>{job.customerId ? (customerNameById.get(job.customerId) ?? job.customerId) : 'â€”'}</td>
                  <td style={{ padding: 8 }}>{JOB_STATUS_LABEL[job.status] ?? job.status}</td>
                  <td style={{ padding: 8 }}>{Math.round((job.stageProgress ?? 0) * 100)}%</td>
                  <td style={{ padding: 8 }}>{PAYMENT_STATUS_LABEL[job.paymentStatus] ?? job.paymentStatus}</td>
                  <td style={{ padding: 8 }}>{formatRelativeTime(job.createdAt)}</td>
                  <td style={{ padding: 8 }}>
                    {job.downloadUrl ? (
                      <button type="button" onClick={() => handleDownloadJob(job.id)} style={{ border: 0, background: 'none', color: '#2563EB', cursor: 'pointer', padding: 0 }}>Táº£i</button>
                    ) : 'â€”'}
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
                <tr><td colSpan={8…2442 tokens truncated…ion>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="checkbox"
                  checked={incidentShowResolved}
                  onChange={(e) => setIncidentShowResolved(e.target.checked)}
                />
                Hiá»‡n cáº£ Ä‘Ã£ xá»­ lÃ½
              </label>
            </div>
          </div>
          {/* Phase 6 CWS_WORKER_ROADMAP.md â€” CHá»ˆ Ä‘á»c (worker_incidents qua
              RPC report_worker_incident(), xem worker_migrations/004_...).
              Hiá»‡n táº¡i chá»‰ cÃ³ WORKER_CRASH (tá»± Ä‘á»™ng, má»Ÿ rá»™ng tá»«
              report_worker_crash() cÃ³ sáºµn) vÃ  MERGE_FAIL (Worker tá»± gá»i khi
              attempt_job_video_merge() lá»—i) â€” cÃ¡c loáº¡i lá»—i khÃ¡c trong roadmap
              (GPU/CPU quÃ¡ nhiá»‡t, disk full...) CHÆ¯A cÃ³ code phÃ¡t hiá»‡n, sáº½
              khÃ´ng xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y cho tá»›i khi Ä‘Æ°á»£c lÃ m á»Ÿ vÃ²ng sau. NÃºt
              Retry/Requeue gá»i RPC tÆ°Æ¡ng á»©ng â€” RPC tá»± kiá»ƒm tra Ä‘iá»u kiá»‡n
              (retry chá»‰ hoáº¡t Ä‘á»™ng náº¿u task Ä‘ang failed, requeue chá»‰ náº¿u
              Ä‘ang active), báº¥m sai Ä‘iá»u kiá»‡n chá»‰ tráº£ vá» khÃ´ng thÃ nh cÃ´ng,
              khÃ´ng gÃ¢y háº¡i gÃ¬ thÃªm. */}
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Gáº§n nháº¥t</th>
                  <th style={{ padding: 8 }}>Worker</th>
                  <th style={{ padding: 8 }}>Task</th>
                  <th style={{ padding: 8 }}>Loáº¡i</th>
                  <th style={{ padding: 8 }}>Má»©c Ä‘á»™</th>
                  <th style={{ padding: 8 }}>Sá»‘ láº§n</th>
                  <th style={{ padding: 8 }}>TÃ³m táº¯t</th>
                  <th style={{ padding: 8 }}>Tráº¡ng thÃ¡i</th>
                  <th style={{ padding: 8 }}>HÃ nh Ä‘á»™ng</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8 }}>{formatRelativeTime(inc.lastSeenAt)}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{inc.workerId ?? 'â€”'}</td>
                    <td style={{ padding: 8 }}>{inc.taskId ?? 'â€”'}</td>
                    <td style={{ padding: 8 }}>{inc.eventType}</td>
                    <td style={{ padding: 8 }}>{inc.severity}</td>
                    <td style={{ padding: 8 }}>{inc.occurrenceCount}</td>
                    <td style={{ padding: 8, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inc.summary}>
                      {inc.summary}
                    </td>
                    <td style={{ padding: 8 }}>{inc.resolvedAt ? 'ÄÃ£ xá»­ lÃ½' : 'ChÆ°a xá»­ lÃ½'}</td>
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
                  <tr><td colSpan={9} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>KhÃ´ng cÃ³ sá»± cá»‘ nÃ o khá»›p bá»™ lá»c</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            YÃªu cáº§u há»— trá»£ cá»§a khÃ¡ch
          </h3>
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>MÃ£</th>
                  <th style={{ padding: 8 }}>Customer</th>
                  <th style={{ padding: 8 }}>Job</th>
                  <th style={{ padding: 8 }}>Chá»§ Ä‘á»/ná»™i dung</th>
                  <th style={{ padding: 8 }}>Tráº¡ng thÃ¡i</th>
                  <th style={{ padding: 8 }}>Pháº£n há»“i dá»± kiáº¿n</th>
                  <th style={{ padding: 8 }}>Táº¡o lÃºc</th>
                  <th style={{ padding: 8 }}>Thao tÃ¡c</th>
                </tr>
              </thead>
              <tbody>
                {supportTickets.map((ticket) => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{ticket.ticketCode}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{ticket.customerId}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{ticket.jobId ?? 'â€”'}</td>
                    <td style={{ padding: 8, maxWidth: 320 }}>
                      <strong>{ticket.subject}</strong>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.message}</div>
                    </td>
                    <td style={{ padding: 8 }}>{ticket.status}</td>
                    <td style={{ padding: 8 }}>
                      <input
                        type="datetime-local"
                        value={formatDateTimeLocal(ticket.expectedResponseAt)}
                        onChange={(e) => handleSupportTicketExpectedResponse(ticket, e.target.value)}
                        aria-label={'Thá»i gian pháº£n há»“i dá»± kiáº¿n cho ' + ticket.ticketCode}
                        style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #E8E8EA' }}
                      />
                    </td>
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
                  <tr><td colSpan={8} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>ChÆ°a cÃ³ support ticket</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            YÃªu cáº§u chá»‰nh sá»­a cá»§a khÃ¡ch
          </h3>
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Job</th>
                  <th style={{ padding: 8 }}>KhÃ¡ch yÃªu cáº§u</th>
                  <th style={{ padding: 8 }}>Ghi chÃº</th>
                  <th style={{ padding: 8 }}>Tráº¡ng thÃ¡i</th>
                  <th style={{ padding: 8 }}>Táº¡o lÃºc</th>
                  <th style={{ padding: 8 }}>Thao tÃ¡c</th>
                </tr>
              </thead>
              <tbody>
                {editRequests.map((request) => (
                  <tr key={request.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{request.jobId}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{request.requestedBy}</td>
                    <td style={{ padding: 8, maxWidth: 320, whiteSpace: 'pre-wrap' }}>{request.note ?? 'â€”'}</td>
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
                  <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>ChÆ°a cÃ³ yÃªu cáº§u chá»‰nh sá»­a</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            Thá»‘ng kÃª thá»i gian thuÃª host
          </h3>
          {/* Phase 8 CWS_WORKER_ROADMAP.md â€” CHá»ˆ Ä‘á»c (host_usage_sessions,
              tÃ­nh bá»Ÿi RPC compute_host_usage_sessions() qua cron 5 phÃºt/láº§n,
              xem worker_migrations/006_host_usage_billing.sql). "Æ¯á»›c tÃ­nh"
              Ä‘á»ƒ trá»‘ng (â€”) khi status=awaiting_rate (fleets.hourly_rate chÆ°a
              Ä‘Æ°á»£c cáº¥u hÃ¬nh) â€” KHÃ”NG hiá»‡n 0 Ä‘á»ƒ trÃ¡nh hiá»ƒu láº§m miá»…n phÃ­.
              status=decision_required nghÄ©a lÃ  khá»Ÿi Ä‘á»™ng vÆ°á»£t quÃ¡ 7 phÃºt
              (420s), cáº§n Admin xem xÃ©t thá»§ cÃ´ng (roadmap chÆ°a quy Ä‘á»‹nh tá»±
              Ä‘á»™ng xá»­ lÃ½ trÆ°á»ng há»£p nÃ y). "Sá»‘ tiá»n cuá»‘i" â€” nÃºt "XÃ¡c nháº­n"
              há»i sá»‘ tiá»n qua prompt() (tiá»n tá»‡ Ä‘Æ¡n giáº£n, dashboard ná»™i bá»™
              khÃ´ng cáº§n form phá»©c táº¡p), gá»i RPC admin_confirm_host_usage_final_amount()
              â€” hÃ nh Ä‘á»™ng DUY NHáº¤T ghi final_amount, Worker/há»‡ thá»‘ng tá»±
              Ä‘á»™ng khÃ´ng bao giá» tá»± quyáº¿t Ä‘á»‹nh sá»‘ nÃ y. */}
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>LÃºc</th>
                  <th style={{ padding: 8 }}>Worker</th>
                  <th style={{ padding: 8 }}>Task</th>
                  <th style={{ padding: 8 }}>Khá»Ÿi Ä‘á»™ng</th>
                  <th style={{ padding: 8 }}>Render</th>
                  <th style={{ padding: 8 }}>Upload</th>
                  <th style={{ padding: 8 }}>Billable</th>
                  <th style={{ padding: 8 }}>Æ¯á»›c tÃ­nh</th>
                  <th style={{ padding: 8 }}>Sá»‘ tiá»n cuá»‘i</th>
                  <th style={{ padding: 8 }}>Tráº¡ng thÃ¡i</th>
                </tr>
              </thead>
              <tbody>
                {hostUsageSessions.map((hu) => (
                  <tr key={hu.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8 }}>{formatRelativeTime(hu.createdAt)}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{hu.workerId ?? 'â€”'}</td>
                    <td style={{ padding: 8 }}>{hu.taskId ?? 'â€”'}</td>
                    <td style={{ padding: 8 }} title={`NgÆ°á»¡ng miá»…n tÃ­nh: ${formatDurationSeconds(hu.startupGraceSeconds)}`}>
                      {formatDurationSeconds(hu.startupSeconds)}
                    </td>
                    <td style={{ padding: 8 }}>{formatDurationSeconds(hu.renderSeconds)}</td>
                    <td style={{ padding: 8 }}>{formatDurationSeconds(hu.uploadSeconds)}</td>
                    <td style={{ padding: 8 }}>{formatDurationSeconds(hu.billableSeconds)}</td>
                    <td style={{ padding: 8 }}>
                      {hu.estimatedAmount != null ? hu.estimatedAmount.toLocaleString('vi-VN') : 'â€”'}
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
                          XÃ¡c nháº­n
                        </button>
                      )}
                    </td>
                    <td style={{ padding: 8 }}>{hu.status}</td>
                  </tr>
                ))}
                {hostUsageSessions.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>ChÆ°a cÃ³ phiÃªn nÃ o hoÃ n thÃ nh</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            KhÃ¡ch hÃ ng
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>TÃªn</th>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>ID</th>
                  <th style={{ padding: 8 }}>Tham gia lÃºc</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8 }}>{c.fullName ?? 'â€”'}</td>
                    <td style={{ padding: 8 }}>{c.email ?? 'â€”'}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{c.id}</td>
                    <td style={{ padding: 8 }}>{formatRelativeTime(c.createdAt)}</td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>ChÆ°a cÃ³ khÃ¡ch hÃ ng nÃ o</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: 16, fontWeight: 600, marginBottom: 10, marginTop: 28 }}>
            Thiáº¿t bá»‹ thanh toÃ¡n (MBBank Notification Listener)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Thiáº¿t bá»‹</th>
                  <th style={{ padding: 8 }}>Tráº¡ng thÃ¡i</th>
                  <th style={{ padding: 8 }}>Model</th>
                  <th style={{ padding: 8 }}>App version</th>
                  <th style={{ padding: 8 }}>Heartbeat cuá»‘i</th>
                  <th style={{ padding: 8 }}>ThÃ´ng bÃ¡o gáº§n nháº¥t</th>
                  <th style={{ padding: 8 }}>Lá»—i gáº§n nháº¥t</th>
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
                          {isOnline ? 'â— Online' : 'â—‹ Offline'}
                        </span>
                        {!d.isActive && <span style={{ color: '#E5484D', marginLeft: 6 }}>(vÃ´ hiá»‡u hoÃ¡)</span>}
                      </td>
                      <td style={{ padding: 8 }}>{[d.manufacturer, d.model].filter(Boolean).join(' ') || 'â€”'}</td>
                      <td style={{ padding: 8 }}>{d.appVersion ?? 'â€”'}</td>
                      <td style={{ padding: 8 }}>{d.lastHeartbeatAt ? formatRelativeTime(d.lastHeartbeatAt) : 'ChÆ°a tá»«ng'}</td>
                      <td style={{ padding: 8 }}>{d.lastNotificationAt ? formatRelativeTime(d.lastNotificationAt) : 'ChÆ°a tá»«ng'}</td>
                      <td style={{ padding: 8, color: d.lastError ? '#E5484D' : undefined }}>{d.lastError ?? 'â€”'}</td>
                    </tr>
                  );
                })}
                {paymentDevices.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>ChÆ°a cÃ³ thiáº¿t bá»‹ nÃ o Ä‘Äƒng kÃ½</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
