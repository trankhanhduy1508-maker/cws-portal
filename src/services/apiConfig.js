// Production luôn trỏ tới Backend CWS thật. Không có fallback mock/demo.

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_CWS_API_BASE_URL || '',
  WS_BASE_URL: import.meta.env.VITE_CWS_WS_BASE_URL || '',

  ENDPOINTS: {
    UPLOAD_FILE: '/files/upload',
    DRIVE_RESOLVE: '/drive/resolve',
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
    ADMIN_LIST_CUSTOMERS: '/customers/crm',
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
    STAFF_ME: '/staff/me',
    HOST_DASHBOARD: '/host/dashboard',
  },
};

export const IS_BACKEND_CONFIGURED = Boolean(API_CONFIG.BASE_URL);
