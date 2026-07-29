export const JOB_STATUS = {
  IDLE: 'idle', QUEUED: 'queued', SEARCHING_WORKERS: 'searching_workers',
  ALLOCATING_WORKERS: 'allocating_workers', WORKERS_CONNECTED: 'workers_connected',
  RENDERING: 'rendering', PACKAGING: 'packaging', FINISHED: 'finished',
  ERROR: 'error', CANCELLED: 'cancelled',
};
export const STAGE_SEQUENCE = [
  { key: JOB_STATUS.QUEUED, label: 'Đang chờ trong hàng đợi' },
  { key: JOB_STATUS.SEARCHING_WORKERS, label: 'Đang tìm máy xử lý' },
  { key: JOB_STATUS.ALLOCATING_WORKERS, label: 'Đang phân bổ máy' },
  { key: JOB_STATUS.WORKERS_CONNECTED, label: 'Đã kết nối máy xử lý' },
  { key: JOB_STATUS.RENDERING, label: 'Đang render' },
  { key: JOB_STATUS.PACKAGING, label: 'Đang đóng gói kết quả' },
  { key: JOB_STATUS.FINISHED, label: 'Hoàn thành' },
];
export const JOB_STATUS_LABEL = {
  ...Object.fromEntries(STAGE_SEQUENCE.map((s) => [s.key, s.label])),
  [JOB_STATUS.ERROR]: 'Lỗi', [JOB_STATUS.CANCELLED]: 'Đã hủy',
};
export const RENDER_PROFILES = [
  { id:'economy',label:'Economy',tagline:'Rẻ nhất, phù hợp render qua đêm',durationMultiplier:1.8,costMultiplier:.6,queueMultiplier:2.2 },
  { id:'standard',label:'Standard',tagline:'Cân bằng giá và tốc độ',durationMultiplier:1,costMultiplier:1,queueMultiplier:1,recommended:true },
  { id:'priority',label:'Priority',tagline:'Ưu tiên máy xử lý, nhanh hơn',durationMultiplier:.65,costMultiplier:1.6,queueMultiplier:.4 },
  { id:'turbo',label:'Turbo',tagline:'Nhanh nhất, dùng tối đa số máy khả dụng',durationMultiplier:.4,costMultiplier:2.4,queueMultiplier:.1 },
];
export const PAYMENT_METHOD = { MB_BANK_TRANSFER:'mb_bank_transfer', MOMO_MANUAL:'momo_manual' };
export const PAYMENT_METHODS = [
  { id:PAYMENT_METHOD.MB_BANK_TRANSFER,label:'Chuyển khoản MB / VietQR',available:true },
  { id:PAYMENT_METHOD.MOMO_MANUAL,label:'MoMo thủ công',available:true },
];
export const PAYMENT_STATUS = {
  UNPAID:'unpaid', PROCESSING:'processing', AWAITING_TRANSFER:'awaiting_transfer',
  UNDER_REVIEW:'under_review', CONFIRMED:'confirmed', UNDERPAID:'underpaid',
  OVERPAID:'overpaid', REJECTED:'rejected', REFUNDED:'refunded', FAILED:'failed',
  PAID:'confirmed',
};
export const PAYMENT_STATUS_LABEL = {
  unpaid:'Chưa thanh toán',processing:'Đang tạo hướng dẫn',awaiting_transfer:'Chờ chuyển khoản',
  under_review:'Đang chờ quản trị viên xác nhận',confirmed:'Đã xác nhận',
  underpaid:'Thiếu tiền',overpaid:'Thừa tiền',rejected:'Bị từ chối',refunded:'Đã hoàn tiền',failed:'Lỗi',
};
export const ACCEPTED_FILE_EXTENSIONS=['.blend'];
export const MAX_FILE_SIZE_BYTES=2*1024*1024*1024;
export const FILE_SOURCE={UPLOAD:'upload',GOOGLE_DRIVE:'google_drive'};
export const GOOGLE_DRIVE_LINK_PATTERN=/^https:\/\/drive\.google\.com\/(file\/d\/[\w-]+|open\?id=[\w-]+|uc\?id=[\w-]+)/;
