// Cấu hình kết nối Backend — hiện tại CHƯA có Backend thật nên để trống.
// Khi Backend CWS hoàn thành, chỉ cần điền BASE_URL/WS_BASE_URL vào đây
// (hoặc đọc từ biến môi trường .env), KHÔNG cần sửa bất kỳ Component
// hay Service nào khác.

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_CWS_API_BASE_URL || '',
  WS_BASE_URL: import.meta.env.VITE_CWS_WS_BASE_URL || '',

  // Endpoint dự kiến khi Backend hoàn thành (đặt tên trước để dễ đối
  // chiếu, KHÔNG có nghĩa là các endpoint này đã tồn tại thật).
  ENDPOINTS: {
    UPLOAD_FILE: '/files/upload',
    DRIVE_RESOLVE: '/drive/resolve',
    ESTIMATE_JOB: '/jobs/estimate',
    CREATE_PAYMENT: '/payments',
    GET_PAYMENT_STATUS: (paymentId) => `/payments/${paymentId}`,
    CONFIRM_PAYMENT: (paymentId) => `/payments/${paymentId}/confirm`,
    CREATE_JOB: '/jobs',
    GET_JOB: (jobId) => `/jobs/${jobId}`,
    LIST_JOBS: '/jobs',
    CANCEL_JOB: (jobId) => `/jobs/${jobId}/cancel`,
    JOB_PREVIEW: (jobId) => `/jobs/${jobId}/preview`,
    APPROVE_JOB: (jobId) => `/jobs/${jobId}/approve`,
    JOB_DOWNLOAD: (jobId) => `/jobs/${jobId}/download`,
    JOB_REALTIME_WS: (jobId) => `/ws/jobs/${jobId}`,
    // Admin (Giai đoạn 7) — cần header x-admin-key, xem services/adminApi.js.
    ADMIN_LIST_JOBS: '/jobs',
    ADMIN_JOB_BY_STORAGE_CODE: (code) => `/jobs/by-storage-code/${encodeURIComponent(code)}`,
    ADMIN_PAYMENT_BY_CODE: (code) => `/payments/by-code/${encodeURIComponent(code)}`,
    ADMIN_JOB_LOGS: (jobId) => `/jobs/${jobId}/logs`,
  },
};

export const IS_BACKEND_CONFIGURED = Boolean(API_CONFIG.BASE_URL);
