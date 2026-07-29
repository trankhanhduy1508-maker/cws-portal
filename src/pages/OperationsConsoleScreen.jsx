import { useEffect, useState } from 'react';
import { getOperationsOverview, getOperationsTimeline, listOperationsOrders } from '../services/OperationsService';
import './OperationsConsoleScreen.css';

const JOB_FILTERS = ['', 'queued', 'rendering', 'packaging', 'finished', 'error'];
const PAYMENT_FILTERS = ['', 'awaiting_transfer', 'under_review', 'confirmed', 'original_unlocked', 'refunded'];

export default function OperationsConsoleScreen() {
  const [overview, setOverview] = useState(null);
  const [result, setResult] = useState({ items: [], page: 1, pageSize: 25, total: 0 });
  const [filters, setFilters] = useState({ search: '', jobStatus: '', paymentStatus: '', page: 1, pageSize: 25 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let active = true;
      setLoading(true); setError('');
      Promise.all([getOperationsOverview(), listOperationsOrders(filters)])
        .then(([nextOverview, nextResult]) => { if (active) { setOverview(nextOverview); setResult(nextResult); } })
        .catch((e) => { if (active) setError(e.message); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, filters.search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [filters, refreshKey]);

  async function openDetail(order) {
    setSelected(order); setTimeline([]);
    try { setTimeline(await getOperationsTimeline(order.orderId)); }
    catch (e) { setError(e.message); }
  }
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const cards = overview ? [
    ['Awaiting payment', overview.awaitingPayment], ['Queued', overview.queued], ['Running', overview.running],
    ['Failed', overview.failed], ['Completed today', overview.completedToday], ['Online workers', overview.onlineWorkers],
    ['Stale workers', overview.staleWorkers], ['Unresolved alerts', overview.unresolvedAlerts],
  ] : [];

  return <main className="ops-shell">
    <header className="ops-header"><div><p className="ops-kicker">CWS · Phase P2</p><h1>Operations Console</h1><p>Trạng thái vận hành tối thiểu, không chứa analytics hoặc payment mutation.</p></div><button onClick={() => setRefreshKey((v) => v + 1)}>Refresh</button></header>
    {error && <section className="ops-error" role="alert"><span>{error}</span><button onClick={() => setRefreshKey((v) => v + 1)}>Retry</button></section>}
    <section className="ops-overview" aria-label="Overview counts">{cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
    <section className="ops-panel">
      <div className="ops-filters">
        <label>Search<input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Project name" /></label>
        <label>Job<select value={filters.jobStatus} onChange={(e) => updateFilter('jobStatus', e.target.value)}>{JOB_FILTERS.map((v) => <option key={v} value={v}>{v || 'All jobs'}</option>)}</select></label>
        <label>Payment<select value={filters.paymentStatus} onChange={(e) => updateFilter('paymentStatus', e.target.value)}>{PAYMENT_FILTERS.map((v) => <option key={v} value={v}>{v || 'All payments'}</option>)}</select></label>
      </div>
      {loading ? <p className="ops-state" aria-live="polite">Loading operational state…</p> : result.items.length === 0 ? <p className="ops-state">No orders match the current filters.</p> : <div className="ops-table-wrap"><table><thead><tr><th>Customer / Order</th><th>Upload</th><th>Payment</th><th>Job</th><th>Worker</th><th>Progress</th><th>Last update</th><th>Failure</th><th>Output / Download</th></tr></thead><tbody>{result.items.map((order) => <tr key={order.orderId} onClick={() => openDetail(order)} tabIndex="0" onKeyDown={(e) => { if (e.key === 'Enter') openDetail(order); }}><td><strong>{order.customerId}</strong><small>{order.projectName}<br />{order.orderId}</small></td><td>{order.uploadStatus}</td><td>{order.paymentStatus}</td><td>{order.jobStatus}</td><td>{order.assignedWorker || 'Unassigned'}</td><td>{order.progressPercent}%</td><td>{new Date(order.lastUpdatedAt).toLocaleString()}</td><td>{order.failureReason || '—'}</td><td>{order.outputStatus}<small>{order.downloadedAt ? `Downloaded ${new Date(order.downloadedAt).toLocaleString()}` : 'Not downloaded'}</small></td></tr>)}</tbody></table></div>}
      <nav className="ops-pagination" aria-label="Pagination"><button disabled={filters.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}>Previous</button><span>Page {filters.page} / {pages} · {result.total} orders</span><button disabled={filters.page >= pages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}>Next</button></nav>
    </section>
    {selected && <aside className="ops-detail" aria-label="Job detail"><button className="ops-close" onClick={() => setSelected(null)}>Close</button><h2>{selected.projectName}</h2><dl><dt>Customer</dt><dd>{selected.customerId}</dd><dt>Order</dt><dd>{selected.orderId}</dd><dt>Status</dt><dd>{selected.jobStatus}</dd><dt>Worker</dt><dd>{selected.assignedWorker || 'Unassigned'}</dd><dt>Output</dt><dd>{selected.outputStatus}</dd><dt>Attention</dt><dd>{selected.attentionReasons?.join(', ') || 'None'}</dd></dl><h3>Event timeline</h3>{timeline.length ? <ol>{timeline.map((event, index) => <li key={`${event.at}-${index}`}><strong>{event.type}</strong><span>{event.source} · {new Date(event.at).toLocaleString()}</span></li>)}</ol> : <p>No canonical payment/output events yet.</p>}<p className="ops-note">Secure output access uses the existing Outputs API. This console never exposes object keys or persistent URLs.</p></aside>}
  </main>;
}
