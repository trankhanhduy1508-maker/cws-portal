/**
 * KHỚP CHÍNH XÁC với JOB_STATUS trong
 * cws-portal/src/constants/renderConstants.js (frontend).
 *
 * KHÔNG được đổi giá trị string ở đây nếu không đổi đồng thời bên
 * Portal — Portal so sánh trực tiếp bằng giá trị string này
 * (vd `status === JOB_STATUS.FINISHED`), không qua tầng dịch nào.
 */
export enum JobStatus {
  QUEUED = 'queued',
  SEARCHING_WORKERS = 'searching_workers',
  ALLOCATING_WORKERS = 'allocating_workers',
  WORKERS_CONNECTED = 'workers_connected',
  RENDERING = 'rendering',
  /** Render xong, đã có 3-5 ảnh preview watermark — chờ khách bấm duyệt
   * (CWS_ROADMAP_MVP_V1.md, Giai đoạn 4) trước khi đóng gói/mở tải. */
  REVIEW_READY = 'review_ready',
  /** Khách đã duyệt preview — QR MB Bank đã sinh (JobsService.approve()),
   * chờ webhook ngân hàng xác nhận PAID (CWS_MVP_WORKFLOW_FINAL.md:
   * "Khách duyệt → Sinh QR → Webhook → PAID → Mở link tải"). Render đã
   * xong từ TRƯỚC bước này — thanh toán không chặn việc render, chỉ
   * chặn việc MỞ TẢI file gốc. */
  AWAITING_PAYMENT = 'awaiting_payment',
  PACKAGING = 'packaging',
  FINISHED = 'finished',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

/** Thứ tự các giai đoạn xử lý bình thường (không tính ERROR/CANCELLED,
 * đúng như STAGE_SEQUENCE phía Portal — dùng để Scheduler biết bước
 * tiếp theo là gì). */
export const JOB_STAGE_SEQUENCE: JobStatus[] = [
  JobStatus.QUEUED,
  JobStatus.SEARCHING_WORKERS,
  JobStatus.ALLOCATING_WORKERS,
  JobStatus.WORKERS_CONNECTED,
  JobStatus.RENDERING,
  JobStatus.REVIEW_READY,
  JobStatus.AWAITING_PAYMENT,
  JobStatus.PACKAGING,
  JobStatus.FINISHED,
];

/** Trạng thái là điểm kết thúc (không còn xử lý tiếp) */
export function isTerminalStatus(status: JobStatus): boolean {
  return (
    status === JobStatus.FINISHED ||
    status === JobStatus.ERROR ||
    status === JobStatus.CANCELLED
  );
}
