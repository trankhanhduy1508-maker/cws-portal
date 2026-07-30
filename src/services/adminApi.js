// ============================================================
// adminApi — Dashboard Admin (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7).
// Gọi thẳng Backend NestJS, KHÔNG qua mockBackend.js (Admin không có
// khái niệm demo — chỉ dùng được khi đã cấu hình Backend thật). Mọi
// request đính kèm header x-admin-key (xem backend/src/common/guards/admin-key.guard.ts).
// ============================================================

import { API_CONFIG, IS_BACKEND_CONFIGURED } from './apiConfig';

async function adminFetch(path, adminKey) {
  if (!IS_BACKEND_CONFIGURED) {
    throw new Error('Chưa cấu hình Backend thật — Admin Dashboard không dùng được ở chế độ demo.');
  }
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (res.status === 401) throw new Error('Sai admin key');
  if (!res.ok) throw new Error(`Yêu cầu thất bại (${res.status})`);
  return res.json();
}

/** Danh sách toàn bộ khách hàng (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
export function adminListCustomers(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_CUSTOMERS, adminKey);
}

/** Danh sách toàn bộ job của mọi khách hàng. */
export function adminListJobs(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_JOBS, adminKey);
}

/** Trạng thái Worker Fleet (CWS_MVP_WORKFLOW_FINAL.md, mục Admin —
 * "Worker") — chỉ đọc, không can thiệp. */
export function adminListWorkers(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_WORKERS, adminKey);
}

/** Ảnh preview của 1 job (CWS_MVP_WORKFLOW_FINAL.md, mục Admin —
 * "Preview") — cần x-admin-key nếu job đã có chủ (khách đăng nhập),
 * xem JobsService.assertOwnership() trong Backend (trước đây route này
 * mở công khai theo jobId, không kiểm tra chủ sở hữu — đã sửa lỗ hổng
 * IDOR, xem docs/MVP_GAP_REPORT.md). */
export async function adminGetJobPreview(jobId, adminKey) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_PREVIEW(jobId)}`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (!res.ok) throw new Error(`Không lấy được ảnh preview (${res.status})`);
  return res.json();
}

/** Tra cứu 1 job theo Storage Code. */
export function adminGetJobByStorageCode(storageCode, adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_JOB_BY_STORAGE_CODE(storageCode), adminKey);
}

/** Tra cứu payment theo Payment Code. */
export function adminGetPaymentByCode(paymentCode, adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_PAYMENT_BY_CODE(paymentCode), adminKey);
}

/** Log Worker (báo lỗi render) của 1 job — cần x-admin-key nếu job đã
 * có chủ (cùng lý do với adminGetJobPreview ở trên). */
export async function adminGetJobLogs(jobId, adminKey) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_JOB_LOGS(jobId)}`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (!res.ok) throw new Error(`Không lấy được log (${res.status})`);
  return res.json();
}

/** URL tải file kết quả cho link `<a href>` trong bảng Job — dùng thẳng
 * làm href (không phải fetch()) nên phải đính `adminKey` qua query string
 * thay vì header `x-admin-key` (điều hướng trình duyệt thường không set
 * được custom header, xem admin-key.guard.ts#isValidAdminKey). */
export function adminGetDownloadUrl(jobId, adminKey) {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_DOWNLOAD(jobId)}?adminKey=${encodeURIComponent(adminKey)}`;
}
