import { JobStatus } from './job-status.enum';
import { RenderProfileId } from './render-profile';

/** Ước tính ETA/giá/hàng đợi — khớp shape trả về của estimateJob() phía Portal */
export interface JobEstimate {
  etaSeconds: number;
  costVnd: number;
  queueSeconds: number;
}

/**
 * Đại diện 1 "job" theo góc nhìn của Customer Portal — KHÁC với bảng
 * `jobs`/`tasks` nội bộ mà Worker Fleet dùng để render thật (2 bảng đó
 * GIỮ NGUYÊN không đổi). RenderOrder là lớp phủ trên cùng, ánh xạ sang
 * `jobs`/`tasks` nội bộ khi thật sự dispatch cho Worker.
 *
 * Lý do tách riêng: `tasks.status` nội bộ (queued/active/done/...) là
 * trạng thái THỰC THI từng task/frame, còn JobStatus ở đây là trạng
 * thái TƯỜNG THUẬT cho khách hàng (searching_workers/allocating_workers/
 * ...) — 2 khái niệm khác nhau, không nên trộn vào cùng 1 cột.
 */
export interface RenderOrder {
  id: string;
  projectName: string;
  /** Mã tra cứu ngắn cho khách/admin (CWS_ROADMAP_MVP_V1.md: "Sinh Storage Code"). */
  storageCode: string;
  profileId: RenderProfileId;
  status: JobStatus;
  stageProgress: number; // 0..1 trong giai đoạn hiện tại

  paymentId: string | null;
  paymentStatus: 'unpaid' | 'processing' | 'paid' | 'failed';

  estimate: JobEstimate;

  driveLink: string | null;
  uploadedFileB2Key: string | null;
  fileSizeBytes: number | null;

  /** FK sang bảng `jobs` nội bộ (Worker Fleet) — null cho tới khi
   * Scheduler thật sự dispatch (Model 1/2 tìm được Worker để giao). */
  internalJobId: string | null;

  createdAt: number; // epoch ms, khớp kiểu Portal đang dùng (Date.now())
  downloadUrl: string | null;
  durationSec: number | null;
  resultSizeBytes: number | null;
  isPlaceholder: boolean;
}

/** Input để tạo 1 RenderOrder mới — khớp shape Portal gửi lên qua POST /jobs */
export interface CreateRenderOrderInput {
  fileRef: string | null;
  driveLink: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  profileId: RenderProfileId;
  paymentId: string;
}
