import { useState, useEffect, useCallback } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import {
  signInStaffWithGoogle,
  getStaffSession,
  getAssuranceLevel,
  listVerifiedTotpFactors,
  enrollTotp,
  createChallenge,
  verifyChallenge,
  getStaffAccessToken,
} from '../services/staffAuth';
import { getStaffMfaStatus } from '../services/staffApi';

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: '1.5px solid #E8E8EA',
  fontFamily: 'inherit',
};

/**
 * Đăng nhập Admin/Host: Google OAuth (Supabase Auth) -> BẮT BUỘC MFA
 * (TOTP chính thức của Supabase, xem services/staffAuth.js) trước khi
 * gọi `onAuthenticated(accessToken)`. KHÔNG có đường tắt nào bỏ qua
 * bước MFA — nếu tài khoản chưa enroll factor nào, màn hình này ép
 * enroll ngay (quét QR bằng Google/Microsoft Authenticator) trước khi
 * cho vào Dashboard, đúng yêu cầu "admin chưa MFA -> DENIED".
 */
export default function StaffMfaLogin({ onAuthenticated }) {
  // step: 'google' -> 'challenge' (đã có factor, nhập mã) ->
  // 'enroll' (chưa có factor, hiện QR + nhập mã lần đầu)
  const [step, setStep] = useState('google');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState(null);
  const [challengeId, setChallengeId] = useState(null);
  const [enrollData, setEnrollData] = useState(null); // { qr_code, secret }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const prepareAuthenticatedStaff = useCallback(async () => {
    const session = await getStaffSession();
    if (!session) return;

    // Do not enroll a random customer account. This endpoint only confirms
    // staff membership and does not grant access to Admin data.
    await getStaffMfaStatus();
    const assurance = await getAssuranceLevel();
    if (assurance.currentLevel === 'aal2') {
      onAuthenticated(session.access_token);
      return;
    }

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
  }, [onAuthenticated]);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        if (mounted) setIsLoading(true);
        await prepareAuthenticatedStaff();
      } catch (err) {
        if (mounted) setError(err.message || 'Không thể kiểm tra phiên nhân sự');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    restore();
    return () => { mounted = false; };
  }, [prepareAuthenticatedStaff]);

  async function handleGoogleLogin() {
    setError(null);
    setIsLoading(true);
    try {
      await signInStaffWithGoogle();
    } catch (err) {
      setError(err.message);
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

  if (step === 'google') {
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', padding: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
          CWS Admin — Đăng nhập Google
        </h2>
        <p style={{ fontSize: 13.5, color: '#666', marginBottom: 14 }}>
          Chỉ tài khoản Google đã được cấp role Admin/Host mới được tiếp tục.
          Sau Google Login, Authenticator TOTP vẫn bắt buộc.
        </p>
        {error && <div style={{ color: '#E5484D', fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button type="button" className="btn btn--primary btn--full" disabled={isLoading} onClick={handleGoogleLogin}>
          <LogIn size={16} strokeWidth={2} style={{ marginRight: 6 }} />
          {isLoading ? 'Đang mở Google...' : 'Đăng nhập bằng Google'}
        </button>
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
