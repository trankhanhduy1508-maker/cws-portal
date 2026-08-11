// Hằng số dùng chung — tách riêng để Service và UI cùng tham chiếu
// 1 nguồn sự thật duy nhất, không lặp lại định nghĩa ở nhiều nơi.

// ============================================================
// JOB STATUS — vòng đời 1 job: Upload → Render → Validate → B2 full output
// locked → watermark preview → final price/QR → SePay → PAID → unlock.
// ============================================================
export const JOB_STATUS = {
  IDLE: 'idle',
  QUEUED: 'queued',
  SEARCHING_WORKERS: 'searching_workers',
  ALLOCATING_WORKERS: 'allocating_workers',
  WORKERS_CONNECTED: 'workers_connected',
  RENDERING: 'rendering',
  REVIEW_READY: 'review_ready',
  AWAITING_PAYMENT: 'awaiting_payment',
  PACKAGING: 'packaging',
  FINISHED: 'finished',
  ERROR: 'error',
  CANCELLED: 'cancelled',
};

export const STAGE_SEQUENCE = [
  { key: JOB_STATUS.QUEUED, label: 'Đang chờ trong hàng đợi' },
  { key: JOB_STATUS.SEARCHING_WORKERS, label: 'Đang tìm máy xử lý' },
  { key: JOB_STATUS.ALLOCATING_WORKERS, label: 'Đang phân bổ máy' },
  { key: JOB_STATUS.WORKERS_CONNECTED, label: 'Đã kết nối máy xử lý' },
  { key: JOB_STATUS.RENDERING, label: 'Đang render' },
  { key: JOB_STATUS.REVIEW_READY, label: 'Kết quả xem trước đã sẵn sàng' },
  { key: JOB_STATUS.AWAITING_PAYMENT, label: 'Chờ thanh toán' },
  { key: JOB_STATUS.PACKAGING, label: 'Đang hoàn tất kết quả' },
  { key: JOB_STATUS.FINISHED, label: 'Hoàn thành' },
];

export const JOB_STATUS_LABEL = {
  ...Object.fromEntries(STAGE_SEQUENCE.map((s) => [s.key, s.label])),
  [JOB_STATUS.ERROR]: 'Lỗi',
  [JOB_STATUS.CANCELLED]: 'Đã hủy',
};

// Customer không chọn tốc độ/tier hay số Worker. Scheduler quyết định
// tài nguyên tự động theo deadline và capacity thật.

// ============================================================
// PAYMENT — MVP chỉ dùng MB Bank QR, sinh SAU khi render/output lock/preview
// thật — không có lựa chọn phương thức.
// ============================================================
export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
};

export const PAYMENT_STATUS_LABEL = {
  [PAYMENT_STATUS.UNPAID]: 'Chưa thanh toán',
  [PAYMENT_STATUS.PROCESSING]: 'Đang xử lý thanh toán',
  [PAYMENT_STATUS.PAID]: 'Đã thanh toán',
  [PAYMENT_STATUS.FAILED]: 'Thanh toán thất bại',
};

export const ACCEPTED_FILE_EXTENSIONS = ['.blend', '.zip', '.rar'];
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

export const FILE_SOURCE = {
  UPLOAD: 'upload',
  GOOGLE_DRIVE: 'google_drive',
};

export const GOOGLE_DRIVE_LINK_PATTERN =
  /^https:\/\/drive\.google\.com\/(file\/d\/[\w-]+|open\?id=[\w-]+|uc\?id=[\w-]+)/;
export const SHARED_LINK_PATTERNS = [GOOGLE_DRIVE_LINK_PATTERN];
