import { useCallback, useEffect, useState } from 'react';
import {
  Activity, BriefcaseBusiness, CreditCard,
  FileKey2, LayoutDashboard, LogOut, RefreshCw, Server, Settings,
  ShieldAlert, Users,
} from 'lucide-react';
import StaffMfaLogin from '../components/StaffMfaLogin';
import {
  adminIssueEnrollmentTickets, adminListCustomers, adminListIncidents,
  adminListJobs, adminListPaymentAnomalies, adminListWorkers,
} from '../services/adminApi';
import { signOutStaff } from '../services/staffAuth';
import './AdminScreen.css';

const NAV = [
  ['overview', 'Tá»•ng quan', LayoutDashboard], ['jobs', 'Jobs', BriefcaseBusiness],
  ['customers', 'KhÃ¡ch hÃ ng', Users], ['workers', 'Workers / Nodes', Server],
  ['payments', 'Payments', CreditCard], ['enrollment', 'Enrollment', FileKey2],
  ['logs', 'Logs', Activity], ['health', 'System Health', ShieldAlert],
  ['settings', 'Settings', Settings],
];

function display(value, fallback = 'â€”') { return value === null || value === undefined || value === '' ? fallback : value; }
function statusTone(value) {
  const text = String(value || '').toUpperCase();
  if (['ONLINE', 'IDLE', 'ACTIVE_IDLE', 'READY', 'ELIGIBLE', 'PAID', 'COMPLETED', 'FINISHED'].some((v) => text.includes(v))) return 'good';
  if (['FAILED', 'ERROR', 'OFFLINE', 'STALE', 'UNHEALTHY'].some((v) => text.includes(v))) return 'bad';
  return 'warn';
}
function Pill({ value }) { return <span className={`admin-pill admin-pill--${statusTone(value)}`}>{display(value, 'UNKNOWN')}</span>; }
function formatDate(value) { return value ? new Date(value).toLocaleString('vi-VN') : 'â€”'; }
function Metric({ label, value, hint }) { return <div className="admin-card admin-stat"><div className="admin-stat-label">{label}</div><div className="admin-stat-value">{value}</div><div className="admin-stat-meta">{hint}</div></div>; }
function Section({ title, action, children }) { return <section className="admin-card admin-section"><div className="admin-section-head"><h2>{title}</h2>{action}</div>{children}</section>; }
function Empty({ children = 'ChÆ°a cÃ³ dá»¯ liá»‡u tá»« API.' }) { return <div className="admin-empty">{children}</div>; }

function Overview({ data }) {
  const { jobs, workers, customers, incidents, anomalies } = data;
  const online = workers.filter((w) => w.online || ['ONLINE', 'ACTIVE_IDLE', 'READY'].includes(String(w.status || '').toUpperCase())).length;
  const rendering = workers.filter((w) => ['BUSY', 'RENDERING'].includes(String(w.nodeState || w.status || '').toUpperCase())).length;
  const failed = jobs.filter((j) => String(j.status || '').toUpperCase() === 'FAILED').length;
  const pending = jobs.filter((j) => ['QUEUED', 'CREATED', 'WAITING_PAYMENT', 'AWAITING_PAYMENT'].includes(String(j.status || '').toUpperCase())).length;
  return <>
    <div className="admin-grid">
      <Metric label="Jobs Ä‘ang chá»" value={pending} hint="Tá»« danh sÃ¡ch Jobs tháº­t" />
      <Metric label="Jobs Ä‘ang render" value={rendering} hint="Theo worker state hiá»‡n táº¡i" />
      <Metric label="Jobs lá»—i" value={failed} hint="Cáº§n kiá»ƒm tra" />
      <Metric label="Workers online" value={`${online}/${workers.length}`} hint="Presence tá»« fleet API" />
      <Metric label="KhÃ¡ch hÃ ng" value={customers.length} hint="CRM summaries" />
      <Metric label="Payments báº¥t thÆ°á»ng" value={anomalies.length} hint="Reconciliation API" />
    </div>
    <Section title="Recent jobs"><JobsTable jobs={jobs.slice(0, 12)} /></Section>
    <Section title="Node health"><WorkersTable workers={workers.slice(0, 12)} /></Section>
    <Section title="System alerts"><IncidentsTable incidents={incidents.slice(0, 10)} anomalies={anomalies.slice(0, 10)} /></Section>
  </>;
}

function JobsTable({ jobs }) { return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{['Job ID', 'Customer', 'Status', 'Worker / Node', 'Progress', 'Created'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{jobs.map((j) => <tr key={j.id || j.jobId}><td className="admin-mono">{display(j.id || j.jobId)}</td><td>{display(j.customerName || j.customerEmail || j.customerId)}</td><td><Pill value={j.status} /></td><td>{display(j.workerId || j.nodeId || j.currentTaskId)}</td><td>{display(j.progress ?? j.progressPercent, 'â€”')}</td><td>{formatDate(j.createdAt || j.created_at)}</td></tr>)}</tbody></table>{!jobs.length && <Empty />}</div>; }
function WorkersTable({ workers }) { return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{['Worker ID', 'State', 'Health', 'Last seen', 'Current task', 'GPU / version'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{workers.map((w) => <tr key={w.workerId || w.id}><td className="admin-mono">{display(w.workerId || w.id)}</td><td><Pill value={w.nodeState || w.status || (w.online ? 'ONLINE' : 'OFFLINE')} /></td><td><Pill value={w.healthState || w.health || 'UNKNOWN'} /></td><td>{formatDate(w.lastSeenAt || w.last_seen_at)}</td><td className="admin-mono">{display(w.currentTaskId || w.current_task_id)}</td><td>{display(w.gpuName || w.agentVersion || w.workerVersion)}</td></tr>)}</tbody></table>{!workers.length && <Empty />}</div>; }
function CustomersTable({ customers }) { return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{['Customer', 'Email', 'Customer ID', 'Jobs', 'Paid', 'Last active'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{customers.map((c) => <tr key={c.id}><td>{display(c.fullName || c.displayName)}</td><td>{display(c.email)}</td><td className="admin-mono">{display(c.id)}</td><td>{display(c.totalJobs, 0)}</td><td>{c.totalPaidVnd != null ? `${Number(c.totalPaidVnd).toLocaleString('vi-VN')} Ä‘` : 'â€”'}</td><td>{formatDate(c.lastActiveAt)}</td></tr>)}</tbody></table>{!customers.length && <Empty />}</div>; }
function IncidentsTable({ incidents, anomalies }) { const rows = [...incidents.map((i) => ({ ...i, kind: 'Worker incident' })), ...anomalies.map((a) => ({ ...a, kind: 'Payment anomaly' }))]; return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{['Type', 'Worker / payment', 'Summary', 'Time'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id || i}><td><Pill value={r.kind} /></td><td className="admin-mono">{display(r.workerId || r.paymentId || r.paymentCode)}</td><td>{display(r.summary || r.reason || r.status)}</td><td>{formatDate(r.createdAt || r.lastSeenAt || r.updatedAt)}</td></tr>)}</tbody></table>{!rows.length && <Empty />}</div>; }

function Enrollment({ token }) {
  const [workerIds, setWorkerIds] = useState(''); const [fleetId, setFleetId] = useState('1'); const [expiresMinutes, setExpiresMinutes] = useState('30'); const [result, setResult] = useState(null); const [error, setError] = useState(null); const [loading, setLoading] = useState(false);
  const issue = async (event) => { event.preventDefault(); setError(null); setResult(null); setLoading(true); try { const ids = workerIds.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean); if (!ids.length) throw new Error('Nháº­p Ã­t nháº¥t má»™t worker ID theo enrollment contract.'); const next = await adminIssueEnrollmentTickets(token, { workerIds: ids, fleetId: Number(fleetId), expiresMinutes: Number(expiresMinutes) }); setResult(next); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  return <Section title="Worker enrollment"><p className="admin-muted">Táº¡o ticket ngáº¯n háº¡n qua Backend Admin AAL2. Ticket chá»‰ hiá»ƒn thá»‹ trong phiÃªn nÃ y vÃ  khÃ´ng Ä‘Æ°á»£c lÆ°u vÃ o frontend.</p><form className="admin-form" onSubmit={issue}><label className="admin-field">Worker IDs<input value={workerIds} onChange={(e) => setWorkerIds(e.target.value)} placeholder="node-01, node-02" /></label><label className="admin-field">Fleet ID<input type="number" min="1" value={fleetId} onChange={(e) => setFleetId(e.target.value)} /></label><label className="admin-field">Expires (min)<input type="number" min="5" max="60" value={expiresMinutes} onChange={(e) => setExpiresMinutes(e.target.value)} /></label><button className="admin-btn admin-btn--primary" disabled={loading} type="submit">{loading ? 'Äang cáº¥p...' : 'Cáº¥p ticket'}</button></form>{error && <div className="admin-alert" style={{ marginTop: 14 }}>{error}</div>}{result && <div className="admin-alert" style={{ marginTop: 14, color: '#166534', borderColor: '#bbf7d0', background: '#f0fdf4' }}>Ticket Ä‘Ã£ Ä‘Æ°á»£c backend cáº¥p, háº¿t háº¡n {formatDate(result.expiresAt)}. HÃ£y redeem trÃªn host báº±ng script canonical.</div>}</Section>;
}

function Page({ page, data, token }) {
  if (page === 'overview') return <Overview data={data} />;
  if (page === 'jobs') return <Section title="Jobs"><JobsTable jobs={data.jobs} /></Section>;
  if (page === 'customers') return <Section title="Customers"><CustomersTable customers={data.customers} /></Section>;
  if (page === 'workers') return <Section title="Workers / Nodes"><WorkersTable workers={data.workers} /></Section>;
  if (page === 'payments') return <Section title="Payments"><IncidentsTable incidents={[]} anomalies={data.anomalies} /></Section>;
  if (page === 'enrollment') return <Enrollment token={token} />;
  if (page === 'logs') return <Section title="Operational logs"><IncidentsTable incidents={data.incidents} anomalies={[]} /></Section>;
  if (page === 'health') return <Section title="System health"><WorkersTable workers={data.workers} /></Section>;
  return <Section title="Settings"><Empty>Settings API chÆ°a Ä‘Æ°á»£c backend expose trong capability hiá»‡n táº¡i.</Empty></Section>;
}

export default function AdminScreen() {
  const [token, setToken] = useState(''); const [page, setPage] = useState('overview'); const [data, setData] = useState({ jobs: [], customers: [], workers: [], incidents: [], anomalies: [] }); const [loading, setLoading] = useState(false); const [error, setError] = useState(null);
  const load = useCallback(async (staffToken = token) => { setLoading(true); setError(null); try { const [jobs, customers, workers, incidents, anomalies] = await Promise.all([adminListJobs(staffToken), adminListCustomers(staffToken), adminListWorkers(staffToken), adminListIncidents(staffToken), adminListPaymentAnomalies(staffToken)]); setData({ jobs: Array.isArray(jobs) ? jobs : [], customers: Array.isArray(customers) ? customers : [], workers: Array.isArray(workers) ? workers : [], incidents: Array.isArray(incidents) ? incidents : [], anomalies: Array.isArray(anomalies) ? anomalies : [] }); } catch (err) { setError(err.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u Admin'); } finally { setLoading(false); } }, [token]);
  useEffect(() => { if (token) load(token); }, [token, load]);
  if (!token) return <StaffMfaLogin onAuthenticated={setToken} />;
  const active = NAV.find(([id]) => id === page) || NAV[0];
  const signOut = () => { setToken(''); setData({ jobs: [], customers: [], workers: [], incidents: [], anomalies: [] }); signOutStaff().catch(() => {}); };
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark">C</span><span>CWS ADMIN</span></div><nav className="admin-nav" aria-label="Admin navigation">{NAV.map(([id, label, Icon]) => <button key={id} type="button" aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Icon size={16} />{label}</button>)}</nav></aside><main className="admin-main"><header className="admin-topbar"><div><div className="admin-eyebrow">Operations control plane</div><h1 className="admin-title">{active[1]}</h1></div><div className="admin-actions"><button className="admin-btn" type="button" onClick={() => load()} disabled={loading}><RefreshCw size={14} />{loading ? 'Äang táº£i' : 'LÃ m má»›i'}</button><button className="admin-btn" type="button" onClick={signOut}><LogOut size={14} />ÄÄƒng xuáº¥t</button></div></header>{error && <div className="admin-alert">{error}</div>}<Page page={page} data={data} token={token} /></main></div>;
}
