// ============================================================
// staffApi — đăng nhập Admin/Host THẬT (Phần 6, thay lớp bảo vệ x-admin-
// key đơn thuần bằng RBAC qua Supabase Auth + bảng staff_roles, xem
// backend/src/common/guards/role.guard.ts). Tài khoản Admin/Host tạo
// THỦ CÔNG qua Supabase Dashboard (backend/migrations/013), KHÔNG có màn
// hình tự đăng ký. Dùng CHUNG supabase client với AuthService.js (khách
// hàng) — chấp nhận được vì Admin/Host là nhân sự nội bộ, thường dùng
// trình duyệt/phiên riêng với khách hàng, KHÔNG thiết kế multi-session
// trong cùng 1 tab cho MVP này.
// ============================================================

import { supabase, IS_SUPABASE_CONFIGURED } from './supabaseClient';
import { API_CONFIG } from './apiConfig';

function assertConfigured() {
  if (!IS_SUPABASE_CONFIGURED) {
    throw new Error('Chưa cấu hình Supabase — không đăng nhập nhân sự được.');
  }
}

export async function staffLogout() {
  assertConfigured();
  await supabase.auth.signOut();
}

async function getStaffAccessToken() {
  assertConfigured();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Chưa đăng nhập');
  return token;
}

async function staffFetch(path) {
  const token = await getStaffAccessToken();
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
  if (res.status === 403) throw new Error('Tài khoản không có quyền truy cập');
  if (!res.ok) throw new Error(`Yêu cầu thất bại (${res.status})`);
  return res.json();
}

/** { userId, role } của tài khoản đang đăng nhập — dùng để điều hướng
 * #admin hay #host ngay sau khi đăng nhập (KHÔNG tự đoán role ở Frontend). */
export function getStaffMe() {
  return staffFetch(API_CONFIG.ENDPOINTS.STAFF_ME);
}

/** Pre-MFA role check only; this endpoint exposes no Admin data. */
export function getStaffMfaStatus() {
  return staffFetch('/staff/mfa-status');
}

/** Dữ liệu Host Dashboard — Backend đã tự lọc chỉ trả worker của ĐÚNG
 * Host đang đăng nhập (xem host.controller.ts), Frontend không cần và
 * không được tự lọc thêm. */
export function getHostDashboard() {
  return staffFetch(API_CONFIG.ENDPOINTS.HOST_DASHBOARD);
}
