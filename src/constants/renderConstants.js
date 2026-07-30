// Hằng số dùng chung — tách riêng để Service và UI cùng tham chiếu
// 1 nguồn sự thật duy nhất, không lặp lại định nghĩa ở nhiều nơi.

// ============================================================
// JOB STATUS — vòng đời 1 job TỪ SAU KHI THANH TOÁN xong (bước Upload/
// Validate/Chọn Profile/Thanh toán nằm TRƯỚC khi job thật sự được tạo,
// nên không có mặt trong sequence này).
// ============================================================
export const JOB_STATUS = {
  IDLE: 'idle',
  QUEUED: 'queued',                     // đang chờ trong hàng đợi trước khi tìm máy
  SEARCHING_WORKERS: 'searching_workers',
  ALLOCATING_WORKERS: 'allocating_workers',
  WORKERS_CONNECTED: 'workers_connected',
  RENDERING: 'rendering',
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
// 5). Wallet/Stripe/PayPal/MoMo không thuộc MVP — không dựng UI cho
// các phương thức chưa/không dùng.
// ============================================================
export const PAYMENT_METHOD = {
  QR_BANK: 'qr_bank',
};

export const PAYMENT_METHODS = [
  { id: PAYMENT_METHOD.QR_BANK, label: 'Quét mã QR ngân hàng (MB Bank)', available: true },
];

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

// Regex nhận diện link Google Drive hợp lệ (dạng /file/d/<id>/... hoặc
// ?id=<id>). Đây chỉ là validate CÚ PHÁP — không xác nhận file có tồn
// tại/có quyền truy cập hay không, việc đó cần Backend thật kiểm tra.
export const GOOGLE_DRIVE_LINK_PATTERN =
  /^https:\/\/drive\.google\.com\/(file\/d\/[\w-]+|open\?id=[\w-]+|uc\?id=[\w-]+)/;
