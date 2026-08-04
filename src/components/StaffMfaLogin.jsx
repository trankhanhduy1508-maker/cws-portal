import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import {
  signInStaff,
  signInStaffWithGoogle,
  listVerifiedTotpFactors,
  enrollTotp,
  createChallenge,
  verifyChallenge,
  getStaffAccessToken,
  signOutStaff,
} from '../services/staffAuth';
import { getStaffAccess } from '../services/staffApi';
import { supabase } from '../services/supabaseClient';

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: '1.5px solid #E8E8EA',
  fontFamily: 'inherit',
};

/**
 * ÄÄƒng nháº­p Admin/Host: email/password (Supabase Auth) -> Báº®T BUá»˜C MFA
 * (TOTP chÃ­nh thá»©c cá»§a Supabase, xem services/staffAuth.js) trÆ°á»›c khi
 * gá»i `onAuthenticated(accessToken)`. KHÃ”NG cÃ³ Ä‘Æ°á»ng táº¯t nÃ o bá» qua
 * bÆ°á»›c MFA â€” náº¿u tÃ i khoáº£n chÆ°a enroll factor nÃ o, mÃ n hÃ¬nh nÃ y Ã©p
 * enroll ngay (quÃ©t QR báº±ng Google/Microsoft Authenticator) trÆ°á»›c khi
 * cho vÃ o Dashboard, Ä‘Ãºng yÃªu cáº§u "admin chÆ°a MFA -> DENIED".
 */
export default function StaffMfaLogin({ onAuthenticated, allowedRole = 'admin' }) {
  // step: 'credentials' -> 'challenge' (Ä‘Ã£ cÃ³ factor, nháº­p mÃ£) ->
  // 'enroll' (chÆ°a cÃ³ factor, hiá»‡n QR + nháº­p mÃ£ láº§n Ä‘áº§u)
  const [step, setStep] = useState('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [enrollData, setEnrollData] = useState(null); // { qr_code, secret }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function continueWithMfa() {
    const verifiedFactors = await listVerifiedTotpFactors();
    if (verifiedFactors.length > 0) {
      const fId = verifiedFactors[0].id;
      const challenge = await createChallenge(fId);
      setFactorId(fId);
      setChallengeId(challenge.id);
      setStep('challenge');
      return;
    }
    const enrolled = await enrollTotp();
    setFactorId(enrolled.id);
    setEnrollData(enrolled.totp);
    const challenge = await createChallenge(enrolled.id);
    setChallengeId(challenge.id);
    setStep('enroll');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data?.session || cancelled) return;
      try {
        const access = await getStaffAccess();
        if (access.role !== allowedRole) throw new Error('TÃ i khoáº£n khÃ´ng cÃ³ quyá»n Admin');
        await continueWithMfa();
      } catch (err) {
        if (!cancelled) {
          await signOutStaff().catch(() => {});
          setError(err.message);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [allowedRole]);

  async function handleCredentials(e) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signInStaff(email, password);
      const access = await getStaffAccess();
      if (access.role !== allowedRole) throw new Error('TÃ i khoáº£n khÃ´ng cÃ³ quyá»n Admin');
      await continueWithMfa();
    } catch (err) {
      await signOutStaff().catch(() => {});
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await verifyChallenge(factorId, challengeId, code.trim());
      const token = await getStaffAccessToken();
      onAuthenticated(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (step === 'credentials') {
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          CWS Admin â€” ÄÄƒng nháº­p
        </h2>
        <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={inputStyle}
            autoFocus
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Máº­t kháº©u"
            style={inputStyle}
            required
          />
          {error && <div style={{ color: '#E5484D', fontSize: 13 }}>{error}</div>}
          <button type="submit" className="btn btn--primary btn--full" disabled={isLoading}>
            <KeyRound size={16} strokeWidth={2} style={{ marginRight: 6 }} />
            {isLoading ? 'Äang Ä‘Äƒng nháº­p...' : 'Tiáº¿p tá»¥c'}
          </button>
          <button type="button" className="btn btn--full" disabled={isLoading} onClick={() => signInStaffWithGoogle().catch((err) => setError(err.message))}>
            ÄÄƒng nháº­p báº±ng Google
          </button>
        </form>
      </div>
    );
  }

  if (step === 'enroll') {
    return (
      <div style={{ maxWidth: 380, margin: '60px auto', padding: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Thiáº¿t láº­p MFA (láº§n Ä‘áº§u)
        </h2>
        <p style={{ fontSize: 13.5, color: '#666', marginBottom: 12 }}>
          TÃ i khoáº£n nÃ y CHÆ¯A cÃ³ MFA â€” báº¯t buá»™c thiáº¿t láº­p trÆ°á»›c khi vÃ o
          Dashboard. QuÃ©t mÃ£ QR báº±ng Google Authenticator/Microsoft
          Authenticator, hoáº·c nháº­p thá»§ cÃ´ng mÃ£ bÃªn dÆ°á»›i.
        </p>
        {enrollData?.qr_code && (
          <img
            src={enrollData.qr_code}
            alt="QR code MFA"
            style={{ width: 200, height: 200, margin: '0 auto 12px', display: 'block' }}
          />
        )}
        {enrollData?.secret && (
          <div style={{ fontFamily: 'monospace', fontSize: 13, textAlign: 'center', marginBottom: 12, wordBreak: 'break-all' }}>
            MÃ£ nháº­p thá»§ cÃ´ng: {enrollData.secret}
          </div>
        )}
        <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="MÃ£ 6 sá»‘ tá»« Authenticator"
            style={inputStyle}
            inputMode="numeric"
            autoFocus
            required
          />
          {error && <div style={{ color: '#E5484D', fontSize: 13 }}>{error}</div>}
          <button type="submit" className="btn btn--primary btn--full" disabled={isLoading}>
            <ShieldCheck size={16} strokeWidth={2} style={{ marginRight: 6 }} />
            {isLoading ? 'Äang xÃ¡c thá»±c...' : 'XÃ¡c nháº­n + VÃ o Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  // step === 'challenge'
  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
      <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        XÃ¡c thá»±c MFA
      </h2>
      <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="MÃ£ 6 sá»‘ tá»« Authenticator"
          style={inputStyle}
          inputMode="numeric"
          autoFocus
          required
        />
        {error && <div style={{ color: '#E5484D', fontSize: 13 }}>{error}</div>}
        <button type="submit" className="btn btn--primary btn--full" disabled={isLoading}>
          <ShieldCheck size={16} strokeWidth={2} style={{ marginRight: 6 }} />
          {isLoading ? 'Äang xÃ¡c thá»±c...' : 'XÃ¡c nháº­n'}
        </button>
      </form>
    </div>
  );
}
