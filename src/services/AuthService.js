// ============================================================
// AuthService — Google Login qua Supabase Auth (KHÔNG tự làm OAuth
// thủ công, KHÔNG có form nhập username/password Google ở đây hay
// bất kỳ đâu trong CWS — Google lo đăng nhập/xác minh/xin quyền,
// Supabase Auth lo phiên đăng nhập, CWS chỉ ĐỌC session).
// ============================================================

import { supabase, IS_SUPABASE_CONFIGURED } from './supabaseClient';

/** Access token hiện tại (nếu đã đăng nhập) — đính vào Authorization
 * header khi RenderService.js gọi Backend. */
export async function getAccessToken() {
  if (IS_SUPABASE_CONFIGURED) {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
  return null;
}

/**
 * Bắt đầu đăng nhập Google. Backend thật: Supabase Auth tự lo TOÀN
 * BỘ OAuth (redirect Google, xin quyền, tạo phiên) — hàm này chỉ
 * kích hoạt điều hướng, luôn trả về null (trang sẽ rời đi, quay lại
 * qua useAuth's onAuthStateChange khi Google redirect xong).
 */
export async function startGoogleLogin() {
  if (IS_SUPABASE_CONFIGURED) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw new Error(error.message || 'Không bắt đầu được đăng nhập Google');
    return null;
  }
  throw new Error('Đăng nhập Google chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
}

export async function logout() {
  if (IS_SUPABASE_CONFIGURED) {
    await supabase.auth.signOut();
    return;
  }
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
  callback(null);
  return () => {};
}

/** Trạng thái đăng nhập hiện tại — dùng lúc App khởi động. */
export async function getCurrentUser() {
  if (IS_SUPABASE_CONFIGURED) {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? null;
  }
  return null;
}

/**
 * Google/Supabase báo lỗi OAuth qua query string sau khi redirect về
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

  if (error === 'access_denied') return 'Bạn đã hủy đăng nhập Google';
  return errorDescription || 'Đăng nhập Google thất bại, vui lòng thử lại';
}
