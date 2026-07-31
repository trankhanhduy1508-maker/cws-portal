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

/** Hành động Admin THẬT lên Worker Fleet (retry/requeue/quarantine/drain,
 * ngoài CWS_WORKER_ROADMAP.md — đóng lỗ hổng Phase 6), khác `adminFetch`
 * ở trên vì là POST + có body tuỳ chọn. */
async function adminPost(path, adminKey, body) {
  if (!IS_BACKEND_CONFIGURED) {
    throw new Error('Chưa cấu hình Backend thật — Admin Dashboard không dùng được ở chế độ demo.');
  }
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
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

/** Sự cố Worker Fleet (Phase 6 CWS_WORKER_ROADMAP.md) — chỉ đọc. Hành
 * động retry/requeue/quarantine/drain xem 4 hàm `adminRetryTask`/
 * `adminRequeueTask`/`adminSetWorkerQuarantine`/`adminSetWorkerDrain` bên dưới. */
export function adminListIncidents(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_INCIDENTS, adminKey);
}

/** Đưa 1 task đang status=failed (permanent) về lại queued để thử lại. */
export function adminRetryTask(taskId, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_RETRY_TASK(taskId), adminKey);
}

/** Ép 1 task đang active về queued ngay (không đợi requeue_stale_tasks() tự động sau 240s). */
export function adminRequeueTask(taskId, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_REQUEUE_TASK(taskId), adminKey);
}

/** Bật/tắt quarantine 1 worker — worker bị quarantine sẽ KHÔNG claim được task mới (thực thi thật qua claim_task(), không chỉ là nhãn). */
export function adminSetWorkerQuarantine(workerId, quarantined, reason, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_QUARANTINE_WORKER(workerId), adminKey, { quarantined, reason });
}

/** Bật/tắt drain 1 worker — worker đang drain sẽ hoàn tất task hiện tại nhưng KHÔNG claim task mới. */
export function adminSetWorkerDrain(workerId, draining, reason, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_DRAIN_WORKER(workerId), adminKey, { draining, reason });
}

/** Xác nhận final_amount cho 1 phiên host_usage_sessions (Phase 8) — hành
 * động DUY NHẤT ghi số tiền cuối cùng, Worker/hệ thống tự động không tự quyết định. */
export function adminConfirmHostUsageFinalAmount(sessionId, finalAmount, adminKey) {
  return adminPost(API_CONFIG.ENDPOINTS.ADMIN_CONFIRM_FINAL_AMOUNT(sessionId), adminKey, { finalAmount });
}

/** Thống kê thời gian/tiền thuê host (Phase 8 CWS_WORKER_ROADMAP.md) —
 * chỉ đọc, tính bởi RPC compute_host_usage_sessions() (cron), không phải
 * Backend/Frontend tự tính. */
export function adminListHostUsageSessions(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_HOST_USAGE, adminKey);
}

/** Danh sách thiết bị Android gửi payment notification (MBBank Notification
 * Listener MVP) — chỉ đọc, xem payment-devices.repository.ts. */
export function adminListPaymentDevices(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_PAYMENT_DEVICES, adminKey);
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
