// Cấu hình kết nối Backend — hiện tại CHƯA có Backend thật nên để trống.
// Khi Backend CWS hoàn thành, chỉ cần điền BASE_URL vào đây (hoặc đọc từ
// biến môi trường .env), KHÔNG cần sửa bất kỳ Component hay Service nào khác.

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_CWS_API_BASE_URL || '',
  // Khi có Backend thật, các endpoint dự kiến (đặt tên trước để dễ đối chiếu
  // khi Backend hoàn thành, KHÔNG có nghĩa là các endpoint này đã tồn tại):
  ENDPOINTS: {
    CREATE_JOB: '/jobs',
    JOB_STATUS: (jobId) => `/jobs/${jobId}/status`,
    JOB_DOWNLOAD: (jobId) => `/jobs/${jobId}/download`,
    JOB_CANCEL: (jobId) => `/jobs/${jobId}/cancel`,
    JOB_ESTIMATE: '/jobs/estimate',
    JOB_HISTORY: '/jobs/history',
    QUEUE_STATUS: '/queue/status',
    DRIVE_RESOLVE: '/drive/resolve',
  },
};

export const IS_BACKEND_CONFIGURED = Boolean(API_CONFIG.BASE_URL);
