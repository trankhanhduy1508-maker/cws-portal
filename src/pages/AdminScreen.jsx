import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, KeyRound, Eye, X } from 'lucide-react';
import {
  adminListCustomers, adminListJobs, adminListWorkers, adminGetJobByStorageCode,
  adminGetPaymentByCode, adminGetJobPreview,
} from '../services/adminApi';
import { JOB_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '../constants/renderConstants';
import { formatRelativeTime } from '../utils/timeUtils';

const ADMIN_KEY_STORAGE = 'cws_admin_key';

/**
 * Dashboard Admin (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7) — KHÔNG nằm
 * trong luồng khách hàng bình thường, chỉ truy cập qua URL kèm
 * #admin (xem App.jsx). Bảo vệ bằng x-admin-key (shared secret đơn
 * giản, xem backend/src/common/guards/admin-key.guard.ts) — KHÔNG
 * phải hệ thống đăng nhập/phân quyền enterprise.
 */
export default function AdminScreen() {
  const [adminKey, setAdminKey] = useState(() => {
    try { return sessionStorage.getItem(ADMIN_KEY_STORAGE) || ''; } catch { return ''; }
  });
  const [keyInput, setKeyInput] = useState('');
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [workers, setWorkers] = useState([]);
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
    Promise.all([adminListJobs(key), adminListCustomers(key), adminListWorkers(key)])
      .then(([jobsRes, customersRes, workersRes]) => {
        setJobs(jobsRes);
        setCustomers(customersRes);
        setWorkers(workersRes);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

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

  const handleSaveKey = (e) => {
    e.preventDefault();
    try { sessionStorage.setItem(ADMIN_KEY_STORAGE, keyInput); } catch { /* ignore */ }
    setAdminKey(keyInput);
  };

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
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          CWS Admin
        </h2>
        <form onSubmit={handleSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Admin API Key"
            style={{ padding: 12, borderRadius: 10, border: '1.5px solid #E8E8EA', fontFamily: 'monospace' }}
            autoFocus
          />
          <button type="submit" className="btn btn--primary btn--full">
            <KeyRound size={16} strokeWidth={2} style={{ marginRight: 6 }} />
            Vào Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600 }}>CWS Admin</h2>
        <button onClick={() => loadAll(adminKey)} type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#3B5BFF' }}>
          <RefreshCw size={14} strokeWidth={2} /> Tải lại
        </button>
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
                    {job.downloadUrl ? <a href={job.downloadUrl} target="_blank" rel="noopener noreferrer">Tải</a> : '—'}
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
            Worker Fleet
          </h3>
          <div style={{ overflowX: 'auto', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #E8E8EA' }}>
                  <th style={{ padding: 8 }}>Worker ID</th>
                  <th style={{ padding: 8 }}>GPU</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Last seen</th>
                  <th style={{ padding: 8 }}>Crash count</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.workerId} style={{ borderBottom: '1px solid #F0F0F1' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 12 }}>{w.workerId}</td>
                    <td style={{ padding: 8 }}>{w.gpuName ?? '—'}</td>
                    <td style={{ padding: 8 }}>{w.status}</td>
                    <td style={{ padding: 8 }}>{formatRelativeTime(w.lastSeenAt)}</td>
                    <td style={{ padding: 8 }}>{w.crashCount}</td>
                  </tr>
                ))}
                {workers.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#9a9aa0' }}>Chưa có Worker nào</td></tr>
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
        </>
      )}
    </div>
  );
}
