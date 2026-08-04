import { useCallback, useEffect, useState } from 'react';
import {
  adminListAffiliates, adminListAffiliateWithdrawals, adminListAffiliateCommissions,
  adminSetAffiliateStatus, adminSetAffiliateWithdrawalStatus, adminMakeAffiliateCommissionAvailable,
} from '../services/adminApi';

const money = (value) => Number(value ?? 0).toLocaleString('vi-VN');

export default function AdminAffiliatePanel({ adminKey }) {
  const [data, setData] = useState({ affiliates: [], withdrawals: [], commissions: [] });
  const [error, setError] = useState(null);
  const load = useCallback(() => Promise.all([
    adminListAffiliates(adminKey), adminListAffiliateWithdrawals(adminKey), adminListAffiliateCommissions(adminKey),
  ]).then(([affiliates, withdrawals, commissions]) => setData({ affiliates, withdrawals, commissions })).catch((e) => setError(e.message)), [adminKey]);
  useEffect(() => { load(); }, [load]);
  const action = (promise) => promise.then(load).catch((e) => setError(e.message));

  return <section style={{ margin: '24px 0', padding: 16, border: '1px solid #E8E8EA', borderRadius: 12 }}>
    <h3 style={{ marginTop: 0 }}>Affiliate / payout</h3>
    {error && <p style={{ color: '#E5484D' }}>{error}</p>}
    <h4>Affiliate</h4>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr><th>MÃ£</th><th>Tráº¡ng thÃ¡i</th><th>Available</th><th>Thao tÃ¡c</th></tr></thead><tbody>
      {data.affiliates.map((a) => <tr key={a.id}><td>{a.referral_code}</td><td>{a.status}</td><td>{money(a.affiliate_balances?.available_vnd)}</td><td><button type="button" onClick={() => action(adminSetAffiliateStatus(a.id, a.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE', adminKey))}>{a.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</button></td></tr>)}
    </tbody></table></div>
    <h4>Withdrawal</h4>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr><th>MÃ£ chuyá»ƒn</th><th>Sá»‘ tiá»n</th><th>Tráº¡ng thÃ¡i</th><th>Thao tÃ¡c</th></tr></thead><tbody>
      {data.withdrawals.map((w) => <tr key={w.id}><td>{w.transfer_content}</td><td>{money(w.amount_vnd)}Ä‘</td><td>{w.status}</td><td>{w.status === 'REQUESTED' && <button type="button" onClick={() => action(adminSetAffiliateWithdrawalStatus(w.id, 'APPROVED', adminKey))}>Duyá»‡t</button>} {['APPROVED', 'AWAITING_TRANSFER', 'PROCESSING', 'UNKNOWN'].includes(w.status) && <button type="button" onClick={() => { const ref = window.prompt('MÃ£ giao dá»‹ch ngÃ¢n hÃ ng:'); if (ref) action(adminSetAffiliateWithdrawalStatus(w.id, 'PAID', adminKey, ref)); }}>XÃ¡c nháº­n PAID</button>} {w.status !== 'PAID' && w.status !== 'REJECTED' && <button type="button" onClick={() => action(adminSetAffiliateWithdrawalStatus(w.id, 'REJECTED', adminKey, undefined, 'Admin tá»« chá»‘i'))}>Tá»« chá»‘i</button>}</td></tr>)}
    </tbody></table></div>
    <h4>Commission PENDING</h4>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr><th>Payment</th><th>Commission</th><th>Tráº¡ng thÃ¡i</th><th /></tr></thead><tbody>
      {data.commissions.filter((c) => c.status === 'PENDING').map((c) => <tr key={c.id}><td>{c.payment_id}</td><td>{money(c.commission_vnd)}Ä‘</td><td>{c.status}</td><td><button type="button" onClick={() => action(adminMakeAffiliateCommissionAvailable(c.id, adminKey))}>Available</button></td></tr>)}
    </tbody></table></div>
  </section>;
}
