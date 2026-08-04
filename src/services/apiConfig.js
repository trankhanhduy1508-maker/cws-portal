// Cáº¥u hÃ¬nh káº¿t ná»‘i Backend â€” hiá»‡n táº¡i CHÆ¯A cÃ³ Backend tháº­t nÃªn Ä‘á»ƒ trá»‘ng.
// Khi Backend CWS hoÃ n thÃ nh, chá»‰ cáº§n Ä‘iá»n BASE_URL/WS_BASE_URL vÃ o Ä‘Ã¢y
// (hoáº·c Ä‘á»c tá»« biáº¿n mÃ´i trÆ°á»ng .env), KHÃ”NG cáº§n sá»­a báº¥t ká»³ Component
// hay Service nÃ o khÃ¡c.

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_CWS_API_BASE_URL || '',
  WS_BASE_URL: import.meta.env.VITE_CWS_WS_BASE_URL || '',

  // Endpoint dá»± kiáº¿n khi Backend hoÃ n thÃ nh (Ä‘áº·t tÃªn trÆ°á»›c Ä‘á»ƒ dá»… Ä‘á»‘i
  // chiáº¿u, KHÃ”NG cÃ³ nghÄ©a lÃ  cÃ¡c endpoint nÃ y Ä‘Ã£ tá»“n táº¡i tháº­t).
  ENDPOINTS: {
    UPLOAD_FILE: '/files/upload',
    UPLOAD_RESUMABLE_INIT: '/files/upload-resumable/init',
    UPLOAD_RESUMABLE_STATUS: (sessionId) => `/files/upload-resumable/${sessionId}`,
    UPLOAD_RESUMABLE_PART: (sessionId, partNumber) => `/files/upload-resumable/${sessionId}/parts/${partNumber}`,
    UPLOAD_RESUMABLE_COMPLETE: (sessionId) => `/files/upload-resumable/${sessionId}/complete`,
    UPLOAD_RESUMABLE_ABORT: (sessionId) => `/files/upload-resumable/${sessionId}`,
    DRIVE_RESOLVE: '/drive/resolve',
    ESTIMATE_JOB: '/jobs/estimate',
    // Payment (QR MB Bank) chá»‰ tra cá»©u láº¡i qua Ä‘Ã¢y â€” Portal khÃ´ng tá»±
    // táº¡o payment Ä‘á»™c láº­p ná»¯a, Backend tá»± táº¡o bÃªn trong APPROVE_JOB.
    GET_PAYMENT_STATUS: (paymentId) => `/payments/${paymentId}`,
    CREATE_JOB: '/jobs',
    GET_JOB: (jobId) => `/jobs/${jobId}`,
    LIST_JOBS: '/jobs',
    CANCEL_JOB: (jobId) => `/jobs/${jobId}/cancel`,
    JOB_PREVIEW: (jobId) => `/jobs/${jobId}/preview`,
    APPROVE_JOB: (jobId) => `/jobs/${jobId}/approve`,
    REQUEST_CHANGES_JOB: (jobId) => `/jobs/${jobId}/request-changes`,
    JOB_EDIT_REQUESTS: (jobId) => `/jobs/${jobId}/edit-requests`,
    JOB_DOWNLOAD: (jobId) => `/jobs/${jobId}/download`,
    JOB_DOWNLOAD_URL: (jobId) => `/jobs/${jobId}/download-url`,
    JOB_REALTIME_WS: (jobId) => `/ws/jobs/${jobId}`,
    JOB_REALTIME_TICKET: (jobId) => `/jobs/${jobId}/realtime-ticket`,
    // Admin (Giai Ä‘oáº¡n 7) â€” cáº§n Bearer token Supabase cá»§a staff Ä‘Ã£ qua MFA/RBAC, xem services/adminApi.js.
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
    ADMIN_AFFILIATES: '/admin/affiliates',
    ADMIN_AFFILIATE_STATUS: (id) => `/admin/affiliates/${encodeURIComponent(id)}/status`,
    ADMIN_AFFILIATE_WITHDRAWALS: '/admin/affiliates/withdrawals',
    ADMIN_AFFILIATE_WITHDRAWAL_STATUS: (id) => `/admin/affiliates/withdrawals/${encodeURIComponent(id)}/status`,
    ADMIN_AFFILIATE_COMMISSIONS: '/admin/affiliates/commissions',
    ADMIN_AFFILIATE_COMMISSION_AVAILABLE: (id) => `/admin/affiliates/commissions/${encodeURIComponent(id)}/available`,
    // Staff (Admin/Host tháº­t, Pháº§n 6) â€” cáº§n Authorization: Bearer <session
    // token Supabase>, xem services/staffApi.js.
    STAFF_ME: '/staff/me',
    STAFF_EDIT_REQUESTS: '/staff/edit-requests',
    STAFF_UPDATE_EDIT_REQUEST: (id) => `/staff/edit-requests/${id}`,
    SUPPORT_TICKETS: '/support/tickets',
    SUPPORT_TICKET: (id) => `/support/tickets/${id}`,
    ADMIN_SUPPORT_TICKETS: '/support/admin/tickets',
    ADMIN_SUPPORT_TICKET: (id) => `/support/admin/tickets/${id}`,
    HOST_DASHBOARD: '/host/dashboard',
    AFFILIATE_PROGRAM: '/affiliates/program',
    AFFILIATE_TRACK: '/affiliates/track',
    AFFILIATE_ATTACH: '/affiliates/attach',
    AFFILIATE_REGISTER: '/affiliates/me',
    AFFILIATE_DASHBOARD: '/affiliates/me/dashboard',
    AFFILIATE_BANK_ACCOUNT: '/affiliates/me/bank-account',
    AFFILIATE_WITHDRAWAL: '/affiliates/me/withdrawals',
    AFFILIATE_FEEDBACK: '/affiliates/me/feedback',
  },
};

export const IS_BACKEND_CONFIGURED = Boolean(API_CONFIG.BASE_URL);
