import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAffiliateDashboard, registerAffiliate, requestAffiliateWithdrawal, saveAffiliateBankAccount, sendAffiliateFeedback } from '../services/RenderService';

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} Ä‘`;

export default function AffiliatePage() {
  const auth = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  const [bank, setBank] = useState({ bankName: '', accountNumber: '', accountHolderName: '' });
  const [amount, setAmount] = useState('');
  const [feedback, setFeedback] = useState({ subject: '', message: '', category: 'OTHER', contactEmail: '' });
  const load = () => getAffiliateDashboard().then(setDashboard).catch((e) => setError(e.message));

  useEffect(() => { if (auth.isAuthenticated) load(); }, [auth.isAuthenticated]);

  if (!auth.isAuthenticated) return <main style={{ maxWidth: 760, margin: '40px auto', padding: 24 }}><h1>ChÆ°Æ¡ng trÃ¬nh cá»™ng tÃ¡c viÃªn CWS</h1><p>ÄÄƒng nháº­p Google Ä‘á»ƒ Ä‘Äƒng kÃ½ Affiliate vÃ  xem dashboard.</p><button onClick={auth.login}>ÄÄƒng nháº­p Google</button></main>;
  if (!dashboard) return <main style={{ maxWidth: 760, margin: '40px auto', padding: 24 }}><h1>ChÆ°Æ¡ng trÃ¬nh cá»™ng tÃ¡c viÃªn CWS</h1><button onClick={() => registerAffiliate().then(load).catch((e) => setError(e.message))}>ÄÄƒng kÃ½ Affiliate</button>{error && <p role="alert">{error}</p>}</main>;

  const account = dashboard.account;
  return <main style={{ maxWidth: 1000, margin: '24px auto', padding: 24, fontFamily: 'system-ui' }}>
    <h1>Affiliate CWS</h1>
    <p>Giá»›i thiá»‡u khÃ¡ch hÃ ng báº±ng link cá»§a báº¡n. Hoa há»“ng 10% trÃªn doanh thu há»£p lá»‡; khÃ´ng báº£o Ä‘áº£m thu nháº­p.</p>
    {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
    <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
      <div>Clicks<strong>{dashboard.clicks}</strong></div><div>Conversions<strong>{dashboard.conversions}</strong></div><div>Pending<strong>{money(dashboard.balance.pending_vnd)}</strong></div><div>Available<strong>{money(dashboard.balance.available_vnd)}</strong></div><div>ÄÃ£ rÃºt<strong>{money(dashboard.balance.paid_vnd)}</strong></div>
    </section>
    <section><h2>Referral link</h2><input readOnly value={`${window.location.origin}/?ref=${account.referral_code}`} style={{ width: '80%' }} /><button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/?ref=${account.referral_code}`)}>Copy</button><p>MÃ£: {account.referral_code}</p></section>
    <section><h2>ThÃ´ng tin nháº­n tiá»n</h2><input placeholder="NgÃ¢n hÃ ng" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} /><input placeholder="Sá»‘ tÃ i khoáº£n" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} /><input placeholder="TÃªn chá»§ tÃ i khoáº£n" value={bank.accountHolderName} onChange={(e) => setBank({ ...bank, accountHolderName: e.target.value })} /><button onClick={() => saveAffiliateBankAccount(bank).then(load).catch((e) => setError(e.message))}>LÆ°u tÃ i khoáº£n</button>{dashboard.bankAccount && <p>{dashboard.bankAccount.bank_name} â€” {dashboard.bankAccount.account_number}</p>}</section>
    <section><h2>RÃºt tiá»n</h2><p>Láº§n Ä‘áº§u tá»‘i thiá»ƒu 50.000Ä‘; tá»« láº§n PAID thá»© hai tá»‘i thiá»ƒu 200.000Ä‘.</p><input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /><button onClick={() => requestAffiliateWithdrawal(Number(amount)).then(() => { setAmount(''); load(); }).catch((e) => setError(e.message))}>YÃªu cáº§u rÃºt</button></section>
    <section><h2>GÃ³p Ã½ cho CWS</h2><input placeholder="TiÃªu Ä‘á»" value={feedback.subject} onChange={(e) => setFeedback({ ...feedback, subject: e.target.value })} /><textarea placeholder="Ná»™i dung" value={feedback.message} onChange={(e) => setFeedback({ ...feedback, message: e.target.value })} /><button onClick={() => sendAffiliateFeedback(feedback).then(() => setFeedback({ subject: '', message: '', category: 'OTHER', contactEmail: '' })).catch((e) => setError(e.message))}>Gá»­i gÃ³p Ã½</button></section>
    <section><h2>Lá»‹ch sá»­ commission</h2>{dashboard.commissions.map((c) => <p key={c.id}>{money(c.commission_vnd)} â€” {c.status}</p>)}</section>
    <section><h2>Lá»‹ch sá»­ rÃºt tiá»n</h2>{dashboard.withdrawals.map((w) => <p key={w.id}>{money(w.amount_vnd)} â€” {w.status} â€” {w.transfer_content}</p>)}</section>
  </main>;
}
