// ============================================================
// staffAuth — đăng nhập Admin/Host qua Supabase Auth (Google OAuth)
// + MFA (TOTP) CHÍNH THỨC của Supabase (supabase.auth.mfa.*), KHÔNG tự
// viết/lưu TOTP secret riêng (2026-08-02, Owner yêu cầu "Ưu tiên MFA
// chính thức của auth provider hiện tại"). Backend enforce lại claim
// `aal` từ chính access token này (xem RoleGuard/jwt-claims.util.ts) —
// Frontend không phải là lớp bảo vệ duy nhất, chỉ là nơi hoàn tất thử
// thách MFA để lấy access token đủ "aal2".
// ============================================================

import { supabase, IS_SUPABASE_CONFIGURED } from './supabaseClient';

function ensureConfigured() {
  if (!IS_SUPABASE_CONFIGURED || !supabase) {
    throw new Error('Supabase chưa được cấu hình — không đăng nhập được.');
  }
}

/** Bắt đầu Google OAuth cho staff. Role và AAL2 vẫn được kiểm tra server-side. */
export async function signInStaffWithGoogle() {
  ensureConfigured();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/#admin` },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getStaffSession() {
  ensureConfigured();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

/** Đọc AAL hiện tại của session — 'aal2' nghĩa là ĐÃ hoàn tất MFA
 * trong phiên này, không cần enroll/challenge lại. */
export async function getAssuranceLevel() {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw new Error(error.message);
  return data; // { currentLevel, nextLevel, currentAuthenticationMethods }
}

/** Danh sách factor TOTP đã enroll (verified) của user hiện tại — dùng
 * để biết nên ENROLL (chưa có factor nào) hay CHALLENGE (đã có, chỉ
 * cần nhập mã 6 số). */
export async function listVerifiedTotpFactors() {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return (data?.totp ?? []).filter((f) => f.status === 'verified');
}

/** Bắt đầu enroll 1 factor TOTP mới — Supabase TỰ sinh secret + QR code
 * (data URI SVG, không cần thư viện QR riêng), Frontend KHÔNG bao giờ
 * tự tạo/lưu secret. */
export async function enrollTotp() {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw new Error(error.message);
  return data; // { id, totp: { qr_code, secret, uri } }
}

/** Tạo 1 thử thách cho factor (dùng cho CẢ enroll lần đầu lẫn challenge
 * lúc đăng nhập lại sau này). */
export async function createChallenge(factorId) {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw new Error(error.message);
  return data; // { id: challengeId }
}

/** Xác thực mã 6 số từ app Authenticator — thành công thì session được
 * nâng lên aal2 NGAY (access token mới đã có claim aal:"aal2"). */
export async function verifyChallenge(factorId, challengeId, code) {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw new Error(error.message);
  return data;
}

/** Access token hiện tại (nếu có phiên đăng nhập) — dùng làm Bearer cho
 * mọi request Admin API, KHÔNG phân biệt aal ở đây (Backend tự kiểm
 * tra lại claim aal, Frontend chỉ hiển thị UI, không phải nguồn sự
 * thật bảo mật). */
export async function getStaffAccessToken() {
  ensureConfigured();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOutStaff() {
  ensureConfigured();
  await supabase.auth.signOut();
}
