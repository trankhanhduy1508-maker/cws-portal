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
  /** "Tạo Job" (CWS_MVP_WORKFLOW_FINAL.md): Phần mềm/Phiên bản/Ghi chú —
   * không bắt buộc, chỉ là thông tin tham khảo cho admin/Worker. */
  software: string | null;
  softwareVersion: string | null;
  notes: string | null;
  /** Mã tra cứu ngắn cho khách/admin (CWS_ROADMAP_MVP_V1.md: "Sinh Storage Code"). */
  storageCode: string;
  /** Khách đã đăng nhập Google tạo job này — null nếu chưa đăng nhập
   * (Portal chưa bắt buộc đăng nhập, xem jwt-auth.guard.ts). */
  customerId: string | null;
  profileId: RenderProfileId;
  status: JobStatus;
  stageProgress: number; // 0..1 trong giai đoạn hiện tại

  paymentId: string | null;
  paymentStatus: 'unpaid' | 'processing' | 'paid' | 'failed';

  /** Ước tính TRƯỚC render (heuristic theo dung lượng file) — chỉ để
   * hiển thị lúc chọn Render Profile, KHÔNG phải giá cuối khách trả. */
  estimate: JobEstimate;
  /** Giá THẬT tính sau khi render xong, theo runtime thật của Worker
   * (PricingService, tại JobsService.approve()) — null cho tới lúc đó.
   * Đây mới là số tiền thật sự đưa vào QR MB Bank, KHÔNG phải
   * `estimate.costVnd`. */
  finalPriceVnd: number | null;
  /** Tổng runtime thật (giây) đã dùng để tính finalPriceVnd — lưu lại
   * để admin/khách đối chiếu, không phải số bắt buộc theo roadmap. */
  workerRuntimeSeconds: number | null;

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

/** Input để tạo 1 RenderOrder mới — khớp shape Portal gửi lên qua POST /jobs.
 * KHÔNG có paymentId: thanh toán chỉ diễn ra SAU khi khách duyệt preview
 * (CWS_MVP_WORKFLOW_FINAL.md), không phải điều kiện để tạo job. */
export interface CreateRenderOrderInput {
  fileRef: string | null;
  driveLink: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  software: string | null;
  softwareVersion: string | null;
  notes: string | null;
  profileId: RenderProfileId;
}
