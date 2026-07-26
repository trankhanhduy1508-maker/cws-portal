// Hằng số dùng chung — tách riêng để Service và UI cùng tham chiếu
// 1 nguồn sự thật duy nhất, không lặp lại định nghĩa ở nhiều nơi.

export const JOB_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PREPARING: 'preparing',
  WAITING_WORKER: 'waiting_worker',
  RENDERING: 'rendering',
  PACKAGING: 'packaging',
  FINISHED: 'finished',
  ERROR: 'error',
  CANCELLED: 'cancelled',
};

export const STAGE_SEQUENCE = [
  { key: JOB_STATUS.UPLOADING, label: 'Đang tải lên' },
  { key: JOB_STATUS.PREPARING, label: 'Đang chuẩn bị' },
  { key: JOB_STATUS.WAITING_WORKER, label: 'Đang chờ xử lý' },
  { key: JOB_STATUS.RENDERING, label: 'Đang render' },
  { key: JOB_STATUS.PACKAGING, label: 'Đang đóng gói kết quả' },
  { key: JOB_STATUS.FINISHED, label: 'Hoàn thành' },
];

export const RENDER_SPEEDS = [
  { id: 'eco', label: 'Tiết kiệm', desc: 'Chậm nhất, chi phí thấp nhất', bolts: 1 },
  { id: 'standard', label: 'Tiêu chuẩn', desc: 'Cân bằng tốc độ và chi phí', bolts: 2 },
  { id: 'fast', label: 'Nhanh', desc: 'Ưu tiên tốc độ', bolts: 3 },
  { id: 'ultra', label: 'Siêu nhanh', desc: 'Nhanh nhất có thể', bolts: 4 },
];

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

// Trạng thái Job trong lịch sử — rộng hơn JOB_STATUS vì bao gồm cả
// Cancelled (người dùng tự hủy, không phải lỗi hệ thống)
export const JOB_HISTORY_STATUS = {
  COMPLETED: 'completed',
  RENDERING: 'rendering',
  WAITING: 'waiting',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

export const JOB_HISTORY_STATUS_LABEL = {
  [JOB_HISTORY_STATUS.COMPLETED]: 'Hoàn thành',
  [JOB_HISTORY_STATUS.RENDERING]: 'Đang render',
  [JOB_HISTORY_STATUS.WAITING]: 'Đang chờ',
  [JOB_HISTORY_STATUS.FAILED]: 'Thất bại',
  [JOB_HISTORY_STATUS.CANCELLED]: 'Đã hủy',
};
