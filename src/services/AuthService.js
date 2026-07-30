// ============================================================
// AuthService — Facebook Login (CWS_MVP_WORKFLOW_FINAL.md: "Chỉ dùng
// Facebook Login"). Cùng nguyên tắc mock/real với RenderService.js:
// khi chưa có Backend thật, dùng mockFacebookLogin() để demo vẫn dùng
// được (không có redirect Facebook thật để chờ).
// ============================================================

import { API_CONFIG, IS_BACKEND_CONFIGURED } from './apiConfig';
import * as mock from './mockBackend';

const TOKEN_STORAGE_KEY = 'cws_auth_token';
const CUSTOMER_STORAGE_KEY = 'cws_auth_customer';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getStoredCustomer() {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeSession(token, customer) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
  } catch {
    // localStorage có thể bị chặn (chế độ ẩn danh nghiêm ngặt) — không
    // chặn luồng đăng nhập vì lỗi lưu trữ, chỉ mất phiên khi refresh.
  }
}

export function logout() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  } catch {
    // bỏ qua an toàn, xem storeSession()
  }
}

/**
 * Bắt đầu đăng nhập. Backend thật: chuyển hướng sang GET /auth/facebook
 * (NestJS redirect tiếp sang Facebook OAuth dialog thật). Mock: không
 * có Facebook thật để chuyển hướng, tạo ngay 1 phiên demo giả lập.
 */
export function startFacebookLogin() {
  if (IS_BACKEND_CONFIGURED) {
    window.location.href = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FACEBOOK_LOGIN}`;
    return Promise.resolve(null); // điều hướng rời trang, không có gì để trả về
  }
  return mock.mockFacebookLogin().then(({ token, customer }) => {
    storeSession(token, customer);
    return customer;
  });
}

/**
 * Backend thật redirect khách về Portal kèm `?token=...` sau khi đăng
 * nhập Facebook xong (xem AuthController.facebookCallback ở Backend).
 * Gọi hàm này lúc App khởi động để bắt token đó, lưu lại, và dọn URL.
 * @returns {boolean} true nếu vừa bắt được token mới từ URL
 */
export function consumeTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return false;

  storeSession(token, null); // chưa biết profile chi tiết — Portal chỉ cần token để gọi API sau này
  params.delete('token');
  const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
  window.history.replaceState({}, '', cleanUrl);
  return true;
}

export function isLoggedIn() {
  return Boolean(getStoredToken());
}
