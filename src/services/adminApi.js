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

/** Danh sách toàn bộ job của mọi khách hàng. */
export function adminListJobs(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_JOBS, adminKey);
}

/** Tra cứu 1 job theo Storage Code. */
export function adminGetJobByStorageCode(storageCode, adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_JOB_BY_STORAGE_CODE(storageCode), adminKey);
}

/** Tra cứu payment theo Payment Code. */
export function adminGetPaymentByCode(paymentCode, adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_PAYMENT_BY_CODE(paymentCode), adminKey);
}

/** Log Worker (báo lỗi render) của 1 job — KHÔNG cần admin key (route
 * này công khai theo jobId, xem jobs.controller.ts), giữ ở đây cho gọn. */
export async function adminGetJobLogs(jobId) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_JOB_LOGS(jobId)}`);
  if (!res.ok) throw new Error(`Không lấy được log (${res.status})`);
  return res.json();
}
