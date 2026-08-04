// ============================================================
// staffApi â€” Ä‘Äƒng nháº­p Admin/Host THáº¬T (Pháº§n 6, thay lá»›p báº£o vá»‡ x-admin-
// key Ä‘Æ¡n thuáº§n báº±ng RBAC qua Supabase Auth + báº£ng staff_roles, xem
// backend/src/common/guards/role.guard.ts). TÃ i khoáº£n Admin/Host táº¡o
// THá»¦ CÃ”NG qua Supabase Dashboard (backend/migrations/013), KHÃ”NG cÃ³ mÃ n
// hÃ¬nh tá»± Ä‘Äƒng kÃ½. DÃ¹ng CHUNG supabase client vá»›i AuthService.js (khÃ¡ch
// hÃ ng) â€” cháº¥p nháº­n Ä‘Æ°á»£c vÃ¬ Admin/Host lÃ  nhÃ¢n sá»± ná»™i bá»™, thÆ°á»ng dÃ¹ng
// trÃ¬nh duyá»‡t/phiÃªn riÃªng vá»›i khÃ¡ch hÃ ng, KHÃ”NG thiáº¿t káº¿ multi-session
// trong cÃ¹ng 1 tab cho MVP nÃ y.
// ============================================================

import { supabase, IS_SUPABASE_CONFIGURED } from './supabaseClient';
import { API_CONFIG } from './apiConfig';

function assertConfigured() {
  if (!IS_SUPABASE_CONFIGURED) {
    throw new Error('ChÆ°a cáº¥u hÃ¬nh Supabase â€” khÃ´ng Ä‘Äƒng nháº­p nhÃ¢n sá»± Ä‘Æ°á»£c.');
  }
}

export async function staffLogin(email, password) {
  assertConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message || 'ÄÄƒng nháº­p tháº¥t báº¡i');
  return data.session;
}

export async function staffLogout() {
  assertConfigured();
  await supabase.auth.signOut();
}

async function getStaffAccessToken() {
  assertConfigured();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('ChÆ°a Ä‘Äƒng nháº­p');
  return token;
}

async function staffFetch(path) {
  const token = await getStaffAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('PhiÃªn Ä‘Äƒng nháº­p háº¿t háº¡n, vui lÃ²ng Ä‘Äƒng nháº­p láº¡i');
  if (res.status === 403) throw new Error('TÃ i khoáº£n khÃ´ng cÃ³ quyá»n truy cáº­p');
  if (!res.ok) throw new Error(`YÃªu cáº§u tháº¥t báº¡i (${res.status})`);
  return res.json();
}

/** { userId, role } cá»§a tÃ i khoáº£n Ä‘ang Ä‘Äƒng nháº­p â€” dÃ¹ng Ä‘á»ƒ Ä‘iá»u hÆ°á»›ng
 * #admin hay #host ngay sau khi Ä‘Äƒng nháº­p (KHÃ”NG tá»± Ä‘oÃ¡n role á»Ÿ Frontend). */
export function getStaffMe() {
  return staffFetch(API_CONFIG.ENDPOINTS.STAFF_ME);
}

export function getStaffAccess() {
  return staffFetch(API_CONFIG.ENDPOINTS.STAFF_ACCESS);
}

/** Dá»¯ liá»‡u Host Dashboard â€” Backend Ä‘Ã£ tá»± lá»c chá»‰ tráº£ worker cá»§a ÄÃšNG
 * Host Ä‘ang Ä‘Äƒng nháº­p (xem host.controller.ts), Frontend khÃ´ng cáº§n vÃ 
 * khÃ´ng Ä‘Æ°á»£c tá»± lá»c thÃªm. */
export function getHostDashboard() {
  return staffFetch(API_CONFIG.ENDPOINTS.HOST_DASHBOARD);
}
