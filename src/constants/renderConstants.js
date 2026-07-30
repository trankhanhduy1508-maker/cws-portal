// Hằng số dùng chung — tách riêng để Service và UI cùng tham chiếu
// 1 nguồn sự thật duy nhất, không lặp lại định nghĩa ở nhiều nơi.

// ============================================================
// JOB STATUS — vòng đời 1 job TỪ SAU KHI TẠO job (không cần thanh toán
// trước — render MIỄN PHÍ, khách chỉ trả tiền để MỞ TẢI file gốc sau
// khi đã duyệt bản xem trước, đúng CWS_MVP_WORKFLOW_FINAL.md: Job →
// Upload → Render → Preview → Khách duyệt → Sinh QR → Webhook → PAID
// → Mở tải).
// ============================================================
export const JOB_STATUS = {
  IDLE: 'idle',
  QUEUED: 'queued',                     // đang chờ trong hàng đợi trước khi tìm máy
  SEARCHING_WORKERS: 'searching_workers',
  ALLOCATING_WORKERS: 'allocating_workers',
  WORKERS_CONNECTED: 'workers_connected',
  RENDERING: 'rendering',
  REVIEW_READY: 'review_ready',
  /** Khách đã duyệt preview — QR MB Bank đã sinh, chờ webhook xác nhận
   * PAID trước khi mở tải (KHÔNG chặn việc render, chỉ chặn việc tải
   * file gốc — render đã xong từ trước bước này). */
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
  { key: JOB_STATUS.REVIEW_READY, label: 'Chờ bạn duyệt bản xem trước' },
  { key: JOB_STATUS.AWAITING_PAYMENT, label: 'Chờ thanh toán' },
  { key: JOB_STATUS.PACKAGING, label: 'Đang đóng gói kết quả' },
  { key: JOB_STATUS.FINISHED, label: 'Hoàn thành' },
];

// Nhãn hiển thị cho MỌI trạng thái có thể có của 1 job — dùng chung cho
// Progress Screen (qua STAGE_SEQUENCE ở trên) lẫn Job Dashboard/History
// (cần thêm cả ERROR/CANCELLED mà STAGE_SEQUENCE không có, vì đó không
// phải "giai đoạn" mà là điểm kết thúc bất thường).
export const JOB_STATUS_LABEL = {
  ...Object.fromEntries(STAGE_SEQUENCE.map((s) => [s.key, s.label])),
  [JOB_STATUS.ERROR]: 'Lỗi',
  [JOB_STATUS.CANCELLED]: 'Đã hủy',
};

// ============================================================
// RENDER PROFILE — thay cho speed selector đơn giản trước đây. Mỗi
// profile có hệ số riêng cho ETA/giá/hàng đợi — dùng để mock ước tính,
// Backend thật sẽ thay bằng số liệu tính từ Scheduler/Worker Pool thật.
// ============================================================
export const RENDER_PROFILES = [
  {
    id: 'economy',
    label: 'Economy',
    tagline: 'Rẻ nhất, phù hợp render qua đêm',
    durationMultiplier: 1.8,
    costMultiplier: 0.6,
    queueMultiplier: 2.2,
  },
  {
    id: 'standard',
    label: 'Standard',
    tagline: 'Cân bằng giá và tốc độ',
    durationMultiplier: 1.0,
    costMultiplier: 1.0,
    queueMultiplier: 1.0,
    recommended: true,
  },
  {
    id: 'priority',
    label: 'Priority',
    tagline: 'Ưu tiên máy xử lý, nhanh hơn',
    durationMultiplier: 0.65,
    costMultiplier: 1.6,
    queueMultiplier: 0.4,
  },
  {
    id: 'turbo',
    label: 'Turbo',
    tagline: 'Nhanh nhất, dùng tối đa số máy khả dụng',
    durationMultiplier: 0.4,
    costMultiplier: 2.4,
    queueMultiplier: 0.1,
  },
];

// ============================================================
// PAYMENT — MVP chỉ dùng MB Bank QR (CWS_ROADMAP_MVP_V1.md, Giai đoạn
// 5), sinh SAU khi khách duyệt preview — không có lựa chọn phương thức
// nào để chọn (chỉ 1 phương thức duy nhất), nên không cần hằng số
// PAYMENT_METHOD/PAYMENT_METHODS nữa.
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

// Định dạng file được chấp nhận — đổi ở đây khi Backend hỗ trợ thêm định dạng
export const ACCEPTED_FILE_EXTENSIONS = ['.blend'];
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB, điều chỉnh khi có giới hạn thật từ Backend

// Nguồn file đầu vào — người dùng chọn 1 trong 2
export const FILE_SOURCE = {
  UPLOAD: 'upload',
  GOOGLE_DRIVE: 'google_drive',
};

// Regex nhận diện link chia sẻ hợp lệ — CWS_MVP_WORKFLOW_FINAL.md, mục
// "Tạo Job" chấp nhận Google Drive / OneDrive / Dropbox / Direct Link.
// Đây chỉ validate CÚ PHÁP — không xác nhận file có tồn tại/có quyền
// truy cập hay không, việc đó cần Backend thật kiểm tra (hiện chỉ
// Google Drive có kiểm tra quyền thật qua API key, xem
// backend/src/files/google-drive.service.ts — OneDrive/Dropbox/Direct
// Link chấp nhận cú pháp nhưng CHƯA gọi API thật để xác minh quyền,
// giống hành vi "không bịa dữ liệu" khi thiếu GOOGLE_DRIVE_API_KEY).
export const GOOGLE_DRIVE_LINK_PATTERN =
  /^https:\/\/drive\.google\.com\/(file\/d\/[\w-]+|open\?id=[\w-]+|uc\?id=[\w-]+)/;
export const ONEDRIVE_LINK_PATTERN =
  /^https:\/\/(1drv\.ms\/|[\w-]+\.sharepoint\.com\/|onedrive\.live\.com\/)/;
export const DROPBOX_LINK_PATTERN = /^https:\/\/(www\.)?dropbox\.com\//;
/** Direct Link — bất kỳ URL https nào khác (vd link tải trực tiếp 1
 * file .blend từ server riêng). Đặt SAU CÙNG trong SHARED_LINK_PATTERNS
 * vì đây là catch-all rộng nhất — 3 pattern trên vẫn hữu ích để phân
 * biệt UI/hiển thị, không phải để validate chặt hơn Direct Link. */
export const DIRECT_LINK_PATTERN = /^https:\/\/.+/;
export const SHARED_LINK_PATTERNS = [
  GOOGLE_DRIVE_LINK_PATTERN,
  ONEDRIVE_LINK_PATTERN,
  DROPBOX_LINK_PATTERN,
  DIRECT_LINK_PATTERN,
];
