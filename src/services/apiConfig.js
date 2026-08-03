// Cấu hình kết nối Backend. WS_BASE_URL có thể được đặt riêng khi hạ tầng
// dùng hostname khác; nếu bỏ trống, suy ra từ API URL để production không
// vô tình mở WebSocket bằng URL tương đối.

const BASE_URL = import.meta.env.VITE_CWS_API_BASE_URL || '';
const WS_BASE_URL = import.meta.env.VITE_CWS_WS_BASE_URL
  || BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

export const API_CONFIG = {
  BASE_URL,
  WS_BASE_URL,

  // Endpoint dự kiến khi Backend hoàn thành (đặt tên trước để dễ đối
  // chiếu, KHÔNG có nghĩa là các endpoint này đã tồn tại thật).
  ENDPOINTS: {
    UPLOAD_FILE: '/files/upload',
    DRIVE_RESOLVE: '/drive/resolve',
    ESTIMATE_JOB: '/jobs/estimate',
    // Payment (QR MB Bank) chỉ tra cứu lại qua đây — Portal không tự
    // tạo payment độc lập nữa, Backend tự tạo bên trong APPROVE_JOB.
    GET_PAYMENT_STATUS: (paymentId) => `/payments/${paymentId}`,
    CREATE_JOB: '/jobs',
    GET_JOB: (jobId) => `/jobs/${jobId}`,
    LIST_JOBS: '/jobs',
    CANCEL_JOB: (jobId) => `/jobs/${jobId}/cancel`,
    JOB_PREVIEW: (jobId) => `/jobs/${jobId}/preview`,
    APPROVE_JOB: (jobId) => `/jobs/${jobId}/approve`,
    REQUEST_CHANGES_JOB: (jobId) => `/jobs/${jobId}/request-changes`,
    JOB_DOWNLOAD: (jobId) => `/jobs/${jobId}/download`,
    JOB_REALTIME_WS: (jobId) => `/ws/jobs/${jobId}`,
    // Admin (Giai đoạn 7) — cần header x-admin-key, xem services/adminApi.js.
    ADMIN_LIST_CUSTOMERS: '/customers',
    ADMIN_LIST_WORKERS: '/fleet/workers',
    ADMIN_LIST_INCIDENTS: '/fleet/incidents',
    ADMIN_LIST_HOST_USAGE: '/fleet/host-usage',
    ADMIN_RETRY_TASK: (taskId) => `/fleet/tasks/${taskId}/retry`,
    ADMIN_REQUEUE_TASK: (taskId) => `/fleet/tasks/${taskId}/requeue`,
    ADMIN_QUARANTINE_WORKER: (workerId) => `/fleet/workers/${encodeURIComponent(workerId)}/quarantine`,
    ADMIN_DRAIN_WORKER: (workerId) => `/fleet/workers/${encodeURIComponent(workerId)}/drain`,
    ADMIN_CONFIRM_FINAL_AMOUNT: (sessionId) => `/fleet/host-usage/${sessionId}/confirm-final-amount`,
    ADMIN_LIST_JOBS: '/jobs',
    ADMIN_JOB_BY_STORAGE_CODE: (code) => `/jobs/by-storage-code/${encodeURIComponent(code)}`,
    ADMIN_PAYMENT_BY_CODE: (code) => `/payments/by-code/${encodeURIComponent(code)}`,
    ADMIN_JOB_LOGS: (jobId) => `/jobs/${jobId}/logs`,
    ADMIN_LIST_PAYMENT_DEVICES: '/payments/devices',
    ADMIN_LIST_PAYMENT_ANOMALIES: '/payments/reconciliation-anomalies',
    // Staff (Admin/Host thật, Phần 6) — cần Authorization: Bearer <session
    // token Supabase>, xem services/staffApi.js.
    STAFF_ME: '/staff/me',
    HOST_DASHBOARD: '/host/dashboard',
  },
};

export const IS_BACKEND_CONFIGURED = Boolean(API_CONFIG.BASE_URL);
