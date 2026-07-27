import { RenderOrder } from './domain/render-order';

/** Shape CHÍNH XÁC mà Portal (mockBackend.js/RenderService.js) mong đợi
 * — chỉ trả đúng các field này ra ngoài, không lộ driveLink/B2 key/
 * internalJobId (thông tin nội bộ, hoặc thuộc về khách hàng khác nếu
 * đây là response của listAll). */
export interface RenderOrderPublicJson {
  id: string;
  projectName: string;
  profileId: string;
  status: string;
  stageProgress: number;
  paymentId: string | null;
  paymentStatus: string;
  estimate: { etaSeconds: number; costVnd: number; queueSeconds: number };
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
    profileId: order.profileId,
    status: order.status,
    stageProgress: order.stageProgress,
    paymentId: order.paymentId,
    paymentStatus: order.paymentStatus,
    estimate: order.estimate,
    createdAt: order.createdAt,
    downloadUrl: order.downloadUrl,
    durationSec: order.durationSec,
    resultSizeBytes: order.resultSizeBytes,
    isPlaceholder: order.isPlaceholder,
  };
}
