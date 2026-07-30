// ============================================================
// AuthService — Facebook Login qua Supabase Auth (KHÔNG tự làm OAuth
// thủ công, KHÔNG có form nhập username/password Facebook ở đây hay
// bất kỳ đâu trong CWS — Facebook lo đăng nhập/xác minh/xin quyền,
// Supabase Auth lo phiên đăng nhập, CWS chỉ ĐỌC session). Cùng nguyên
// tắc mock/real với RenderService.js: chưa cấu hình Supabase thì dùng
// mockFacebookLogin() để demo vẫn dùng được.
// ============================================================

import { supabase, IS_SUPABASE_CONFIGURED } from './supabaseClient';
import * as mock from './mockBackend';

const MOCK_TOKEN_KEY = 'cws_mock_auth_token';
const MOCK_CUSTOMER_KEY = 'cws_mock_auth_customer';

function getMockSession() {
  try {
    const token = localStorage.getItem(MOCK_TOKEN_KEY);
    if (!token) return null;
    const raw = localStorage.getItem(MOCK_CUSTOMER_KEY);
    return { token, customer: raw ? JSON.parse(raw) : null };
  } catch {
    return null;
  }
}

function storeMockSession(token, customer) {
  try {
    localStorage.setItem(MOCK_TOKEN_KEY, token);
    localStorage.setItem(MOCK_CUSTOMER_KEY, JSON.stringify(customer));
  } catch {
    // localStorage có thể bị chặn (chế độ ẩn danh nghiêm ngặt) — không
    // chặn luồng đăng nhập vì lỗi lưu trữ, chỉ mất phiên khi refresh.
  }
}

function clearMockSession() {
  try {
    localStorage.removeItem(MOCK_TOKEN_KEY);
    localStorage.removeItem(MOCK_CUSTOMER_KEY);
  } catch {
    // bỏ qua an toàn, xem storeMockSession()
  }
}

/** Access token hiện tại (nếu đã đăng nhập) — đính vào Authorization
 * header khi RenderService.js gọi Backend. */
export async function getAccessToken() {
  if (IS_SUPABASE_CONFIGURED) {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
  return getMockSession()?.token ?? null;
}

/**
 * Bắt đầu đăng nhập Facebook. Backend thật: Supabase Auth tự lo TOÀN
 * BỘ OAuth (redirect Facebook, xin quyền, tạo phiên) — hàm này chỉ
 * kích hoạt điều hướng, luôn trả về null (trang sẽ rời đi, quay lại
 * qua useAuth's onAuthStateChange khi Facebook redirect xong). Mock:
 * không có Facebook thật để chuyển hướng, tạo ngay 1 phiên demo.
 */
export async function startFacebookLogin() {
  if (IS_SUPABASE_CONFIGURED) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message || 'Không bắt đầu được đăng nhập Facebook');
    return null;
  }
  const { token, customer } = await mock.mockFacebookLogin();
  storeMockSession(token, customer);
  return customer;
}

export async function logout() {
  if (IS_SUPABASE_CONFIGURED) {
    await supabase.auth.signOut();
    return;
  }
  clearMockSession();
}

/** Lắng nghe thay đổi trạng thái đăng nhập (đăng nhập/đăng xuất/token
 * refresh). Trả về hàm huỷ đăng ký. Mock: không có sự kiện thật, gọi
 * callback 1 lần với trạng thái hiện tại. */
export function onAuthStateChange(callback) {
  if (IS_SUPABASE_CONFIGURED) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }
  callback(getMockSession()?.customer ?? null);
  return () => {};
}

/** Trạng thái đăng nhập hiện tại — dùng lúc App khởi động. */
export async function getCurrentUser() {
  if (IS_SUPABASE_CONFIGURED) {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  }
  return getMockSession()?.customer ?? null;
}

/**
 * Facebook/Supabase báo lỗi OAuth qua query string sau khi redirect về
 * (khách hủy cấp quyền, callback lỗi...) — vd
 * ?error=access_denied&error_description=.... Đọc 1 lần rồi dọn URL.
 * @returns {string|null} mô tả lỗi (đã dịch nếu là lỗi thường gặp), null nếu không có lỗi
 */
export function consumeOAuthErrorFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  if (!error) return null;

  params.delete('error');
  params.delete('error_description');
  params.delete('error_code');
  const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
  window.history.replaceState({}, '', cleanUrl);

  if (error === 'access_denied') return 'Bạn đã hủy đăng nhập Facebook';
  return errorDescription || 'Đăng nhập Facebook thất bại, vui lòng thử lại';
}
