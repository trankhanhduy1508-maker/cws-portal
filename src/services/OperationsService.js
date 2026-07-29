import { API_CONFIG } from './apiConfig';

function authHeaders() {
  const token = sessionStorage.getItem('cws_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path) {
  const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, { headers: authHeaders() });
  if (response.status === 401) throw new Error('Vui lòng đăng nhập lại.');
  if (response.status === 403) throw new Error('Bạn không có quyền truy cập Operations Console.');
  if (!response.ok) throw new Error(`Operations API lỗi (${response.status}).`);
  return response.json();
}

export function getOperationsOverview() { return request('/operations/overview'); }
export function listOperationsOrders(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== '' && value != null) query.set(key, value); });
  return request(`/operations/orders?${query}`);
}
export function getOperationsOrder(id) { return request(`/operations/orders/${encodeURIComponent(id)}`); }
export function getOperationsTimeline(id) { return request(`/operations/orders/${encodeURIComponent(id)}/timeline`); }
