import { RenderOrder } from './domain/render-order';

/** Shape CHÍNH XÁC mà Portal (mockBackend.js/RenderService.js) mong đợi
 * — chỉ trả đúng các field này ra ngoài, không lộ driveLink/B2 key/
 * internalJobId (thông tin nội bộ, hoặc thuộc về khách hàng khác nếu
 * đây là response của listAll). */
export interface RenderOrderPublicJson {
  id: string;
  projectName: string;
  software: string | null;
  softwareVersion: string | null;
  notes: string | null;
  storageCode: string;
  /** Chính khách hàng xem job của mình (biết trước đó là mình) hoặc
   * admin (Giai đoạn 7, "Tìm kiếm theo Customer") — không lộ thông tin
   * nhạy cảm hơn ID mà chủ job đã biết sẵn. */
  customerId: string | null;
  profileId: string;
  status: string;
  stageProgress: number;
  paymentId: string | null;
  paymentStatus: string;
  estimate: { etaSeconds: number; costVnd: number; queueSeconds: number };
  /** Giá THẬT tính sau khi render xong theo runtime Worker thật — null
   * cho tới khi khách duyệt preview (JobsService.approve()). Đây mới
   * là số tiền thật sự trong QR, KHÔNG phải `estimate.costVnd`. */
  finalPriceVnd: number | null;
  workerRuntimeSeconds: number | null;
  createdAt: number;
  downloadUrl: string | null;
  durationSec: number | null;
  resultSizeBytes: number | null;
  isPlaceholder: boolean;
}

export function toPublicJson(order: RenderOrder): RenderOrderPublicJson {
  return {
    id: order.id,
    projectName: order.projectName,
    software: order.software,
    softwareVersion: order.softwareVersion,
    notes: order.notes,
    storageCode: order.storageCode,
    customerId: order.customerId,
    profileId: order.profileId,
    status: order.status,
    stageProgress: order.stageProgress,
    paymentId: order.paymentId,
    paymentStatus: order.paymentStatus,
    estimate: order.estimate,
    finalPriceVnd: order.finalPriceVnd,
    workerRuntimeSeconds: order.workerRuntimeSeconds,
    createdAt: order.createdAt,
    downloadUrl: order.downloadUrl,
    durationSec: order.durationSec,
    resultSizeBytes: order.resultSizeBytes,
    isPlaceholder: order.isPlaceholder,
  };
}
