import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import {
  signInStaff,
  listVerifiedTotpFactors,
  enrollTotp,
  createChallenge,
  verifyChallenge,
  getStaffAccessToken,
} from '../services/staffAuth';

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: '1.5px solid #E8E8EA',
  fontFamily: 'inherit',
};

/**
 * Đăng nhập Admin/Host: email/password (Supabase Auth) -> BẮT BUỘC MFA
 * (TOTP chính thức của Supabase, xem services/staffAuth.js) trước khi
 * gọi `onAuthenticated(accessToken)`. KHÔNG có đường tắt nào bỏ qua
 * bước MFA — nếu tài khoản chưa enroll factor nào, màn hình này ép
 * enroll ngay (quét QR bằng Google/Microsoft Authenticator) trước khi
 * cho vào Dashboard, đúng yêu cầu "admin chưa MFA -> DENIED".
 */
export default function StaffMfaLogin({ onAuthenticated }) {
  // step: 'credentials' -> 'challenge' (đã có factor, nhập mã) ->
  // 'enroll' (chưa có factor, hiện QR + nhập mã lần đầu)
  const [step, setStep] = useState('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [enrollData, setEnrollData] = useState(null); // { qr_code, secret }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCredentials(e) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signInStaff(email, password);
      const verifiedFactors = await listVerifiedTotpFactors();

      if (verifiedFactors.length > 0) {
        const fId = verifiedFactors[0].id;
        const challenge = await createChallenge(fId);
        setFactorId(fId);
        setChallengeId(challenge.id);
        setStep('challenge');
      } else {
        const enrolled = await enrollTotp();
        setFactorId(enrolled.id);
        setEnrollData(enrolled.totp);
        const challenge = await createChallenge(enrolled.id);
        setChallengeId(challenge.id);
        setStep('enroll');
      }
    } catch (err) {
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
          CWS Admin — Đăng nhập
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
            placeholder="Mật khẩu"
            style={inputStyle}
            required
          />
          {error && <div style={{ color: '#E5484D', fontSize: 13 }}>{error}</div>}
          <button type="submit" className="btn btn--primary btn--full" disabled={isLoading}>
            <KeyRound size={16} strokeWidth={2} style={{ marginRight: 6 }} />
            {isLoading ? 'Đang đăng nhập...' : 'Tiếp tục'}
          </button>
        </form>
      </div>
    );
  }

  if (step === 'enroll') {
    return (
      <div style={{ maxWidth: 380, margin: '60px auto', padding: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Thiết lập MFA (lần đầu)
        </h2>
        <p style={{ fontSize: 13.5, color: '#666', marginBottom: 12 }}>
          Tài khoản này CHƯA có MFA — bắt buộc thiết lập trước khi vào
          Dashboard. Quét mã QR bằng Google Authenticator/Microsoft
          Authenticator, hoặc nhập thủ công mã bên dưới.
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
            Mã nhập thủ công: {enrollData.secret}
          </div>
        )}
        <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Mã 6 số từ Authenticator"
            style={inputStyle}
            inputMode="numeric"
            autoFocus
            required
          />
          {error && <div style={{ color: '#E5484D', fontSize: 13 }}>{error}</div>}
          <button type="submit" className="btn btn--primary btn--full" disabled={isLoading}>
            <ShieldCheck size={16} strokeWidth={2} style={{ marginRight: 6 }} />
            {isLoading ? 'Đang xác thực...' : 'Xác nhận + Vào Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  // step === 'challenge'
  return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
      <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        Xác thực MFA
      </h2>
      <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mã 6 số từ Authenticator"
          style={inputStyle}
          inputMode="numeric"
          autoFocus
          required
        />
        {error && <div style={{ color: '#E5484D', fontSize: 13 }}>{error}</div>}
        <button type="submit" className="btn btn--primary btn--full" disabled={isLoading}>
          <ShieldCheck size={16} strokeWidth={2} style={{ marginRight: 6 }} />
          {isLoading ? 'Đang xác thực...' : 'Xác nhận'}
        </button>
      </form>
    </div>
  );
}
