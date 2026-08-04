// ============================================================
// staffAuth â€” Ä‘Äƒng nháº­p Admin/Host qua Supabase Auth (email/password)
// + MFA (TOTP) CHÃNH THá»¨C cá»§a Supabase (supabase.auth.mfa.*), KHÃ”NG tá»±
// viáº¿t/lÆ°u TOTP secret riÃªng (2026-08-02, Owner yÃªu cáº§u "Æ¯u tiÃªn MFA
// chÃ­nh thá»©c cá»§a auth provider hiá»‡n táº¡i"). Backend enforce láº¡i claim
// `aal` tá»« chÃ­nh access token nÃ y (xem RoleGuard/jwt-claims.util.ts) â€”
// Frontend khÃ´ng pháº£i lÃ  lá»›p báº£o vá»‡ duy nháº¥t, chá»‰ lÃ  nÆ¡i hoÃ n táº¥t thá»­
// thÃ¡ch MFA Ä‘á»ƒ láº¥y access token Ä‘á»§ "aal2".
// ============================================================

import { supabase, IS_SUPABASE_CONFIGURED } from './supabaseClient';

function ensureConfigured() {
  if (!IS_SUPABASE_CONFIGURED || !supabase) {
    throw new Error('Supabase chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh â€” khÃ´ng Ä‘Äƒng nháº­p Ä‘Æ°á»£c.');
  }
}

/** BÆ°á»›c 1: email/password tháº­t (tÃ i khoáº£n Admin/Host do Owner táº¡o thá»§
 * cÃ´ng qua Supabase Dashboard, xem migration 013). */
export async function signInStaff(email, password) {
  ensureConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signInStaffWithGoogle() {
  ensureConfigured();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/?staff=admin` },
  });
  if (error) throw new Error(error.message || 'KhÃ´ng báº¯t Ä‘áº§u Ä‘Æ°á»£c Ä‘Äƒng nháº­p Google Admin');
}

/** Äá»c AAL hiá»‡n táº¡i cá»§a session â€” 'aal2' nghÄ©a lÃ  ÄÃƒ hoÃ n táº¥t MFA
 * trong phiÃªn nÃ y, khÃ´ng cáº§n enroll/challenge láº¡i. */
export async function getAssuranceLevel() {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw new Error(error.message);
  return data; // { currentLevel, nextLevel, currentAuthenticationMethods }
}

/** Danh sÃ¡ch factor TOTP Ä‘Ã£ enroll (verified) cá»§a user hiá»‡n táº¡i â€” dÃ¹ng
 * Ä‘á»ƒ biáº¿t nÃªn ENROLL (chÆ°a cÃ³ factor nÃ o) hay CHALLENGE (Ä‘Ã£ cÃ³, chá»‰
 * cáº§n nháº­p mÃ£ 6 sá»‘). */
export async function listVerifiedTotpFactors() {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return (data?.totp ?? []).filter((f) => f.status === 'verified');
}

/** Báº¯t Ä‘áº§u enroll 1 factor TOTP má»›i â€” Supabase Tá»° sinh secret + QR code
 * (data URI SVG, khÃ´ng cáº§n thÆ° viá»‡n QR riÃªng), Frontend KHÃ”NG bao giá»
 * tá»± táº¡o/lÆ°u secret. */
export async function enrollTotp() {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw new Error(error.message);
  return data; // { id, totp: { qr_code, secret, uri } }
}

/** Táº¡o 1 thá»­ thÃ¡ch cho factor (dÃ¹ng cho Cáº¢ enroll láº§n Ä‘áº§u láº«n challenge
 * lÃºc Ä‘Äƒng nháº­p láº¡i sau nÃ y). */
export async function createChallenge(factorId) {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw new Error(error.message);
  return data; // { id: challengeId }
}

/** XÃ¡c thá»±c mÃ£ 6 sá»‘ tá»« app Authenticator â€” thÃ nh cÃ´ng thÃ¬ session Ä‘Æ°á»£c
 * nÃ¢ng lÃªn aal2 NGAY (access token má»›i Ä‘Ã£ cÃ³ claim aal:"aal2"). */
export async function verifyChallenge(factorId, challengeId, code) {
  ensureConfigured();
  const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw new Error(error.message);
  return data;
}

/** Access token hiá»‡n táº¡i (náº¿u cÃ³ phiÃªn Ä‘Äƒng nháº­p) â€” dÃ¹ng lÃ m Bearer cho
 * má»i request Admin API, KHÃ”NG phÃ¢n biá»‡t aal á»Ÿ Ä‘Ã¢y (Backend tá»± kiá»ƒm
 * tra láº¡i claim aal, Frontend chá»‰ hiá»ƒn thá»‹ UI, khÃ´ng pháº£i nguá»“n sá»±
 * tháº­t báº£o máº­t). */
export async function getStaffAccessToken() {
  ensureConfigured();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOutStaff() {
  ensureConfigured();
  await supabase.auth.signOut();
}
