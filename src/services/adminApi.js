// ============================================================
// adminApi — Dashboard Admin (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7).
// Gọi thẳng Backend NestJS, KHÔNG qua mockBackend.js (Admin không có
// khái niệm demo — chỉ dùng được khi đã cấu hình Backend thật).
//
// 2026-08-02 (Owner yêu cầu MFA bắt buộc, "Không tạo bypass"): mọi
// request giờ đính kèm `Authorization: Bearer <access token Supabase>`
// (thay cho x-admin-key cũ) — token này lấy được CHỈ SAU KHI hoàn tất
// đăng nhập + MFA (TOTP) thật, xem services/staffAuth.js +
// components/StaffMfaLogin.jsx. Backend (RoleGuard) tự kiểm tra lại
// claim `aal` từ chính token, không tin tưởng Frontend.
// ============================================================

import { API_CONFIG, IS_BACKEND_CONFIGURED } from './apiConfig';

async function adminFetch(path, staffToken) {
  if (!IS_BACKEND_CONFIGURED) {
    throw new Error('Chưa cấu hình Backend thật — Admin Dashboard không dùng được ở chế độ demo.');
  }
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (res.status === 401 || res.status === 403) throw new Error('Phiên đăng nhập hết hạn hoặc chưa đủ quyền/MFA — đăng nhập lại.');
  if (!res.ok) throw new Error(`Yêu cầu thất bại (${res.status})`);
  return res.json();
}

/** Hành động Admin THẬT lên Worker Fleet (retry/requeue/quarantine/drain,
 * ngoài CWS_WORKER_ROADMAP.md — đóng lỗ hổng Phase 6), khác `adminFetch`
 * ở trên vì là POST + có body tuỳ chọn. */
async function adminPost(path, staffToken, body) {
  if (!IS_BACKEND_CONFIGURED) {
    throw new Error('Chưa cấu hình Backend thật — Admin Dashboard không dùng được ở chế độ demo.');
  }
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (res.status === 401 || res.status === 403) throw new Error('Phiên đăng nhập hết hạn hoặc chưa đủ quyền/MFA — đăng nhập lại.');
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

/** Payment/refund safety net (2026-08-03, DECISIONS.md "Payment
 * reconciliation") — 3 loại bất thường thanh toán (payment_status lệch
 * khỏi bảng payments thật, webhook kẹt 'processing', đã thanh toán thật
 * nhưng chưa nhận file) — chỉ đọc, xem
 * worker_migrations/015_payment_reconciliation_view.sql. */
export function adminListPaymentAnomalies(adminKey) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_LIST_PAYMENT_ANOMALIES, adminKey);
}

/** Ảnh preview của 1 job (CWS_MVP_WORKFLOW_FINAL.md, mục Admin —
 * "Preview") — cần x-admin-key nếu job đã có chủ (khách đăng nhập),
 * xem JobsService.assertOwnership() trong Backend (trước đây route này
 * mở công khai theo jobId, không kiểm tra chủ sở hữu — đã sửa lỗ hổng
 * IDOR, xem docs/MVP_GAP_REPORT.md). */
export async function adminGetJobPreview(jobId, staffToken) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_PREVIEW(jobId)}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (!res.ok) throw new Error(`Không lấy được ảnh preview (${res.status})`);
  return res.json();
}

/** Tra cứu 1 job theo Storage Code. */
export function adminGetJobByStorageCode(storageCode, staffToken) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_JOB_BY_STORAGE_CODE(storageCode), staffToken);
}

/** Tra cứu payment theo Payment Code. */
export function adminGetPaymentByCode(paymentCode, staffToken) {
  return adminFetch(API_CONFIG.ENDPOINTS.ADMIN_PAYMENT_BY_CODE(paymentCode), staffToken);
}

/** Log Worker (báo lỗi render) của 1 job. */
export async function adminGetJobLogs(jobId, staffToken) {
  const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN_JOB_LOGS(jobId)}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (!res.ok) throw new Error(`Không lấy được log (${res.status})`);
  return res.json();
}

/** URL tải file kết quả cho link `<a href>` trong bảng Job — dùng thẳng
 * làm href (không phải fetch()) nên phải đính token qua query string
 * `?staffToken=` thay vì header Authorization (điều hướng trình duyệt
 * thường không set được custom header, xem staff-auth.util.ts —
 * Backend đọc cả header lẫn query cho đúng use-case này). */
export function adminGetDownloadUrl(jobId, staffToken) {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.JOB_DOWNLOAD(jobId)}?staffToken=${encodeURIComponent(staffToken)}`;
}
