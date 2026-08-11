import { RenderOrder } from './domain/render-order';

export interface RenderOrderPublicJson {
  id: string;
  projectName: string;
  software: string | null;
  softwareVersion: string | null;
  notes: string | null;
  storageCode: string;
  customerId: string | null;
  status: string;
  stageProgress: number;
  paymentId: string | null;
  paymentStatus: string;
  estimate: { etaSeconds: number; costVnd: number; queueSeconds: number };
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
    status: order.status,
    stageProgress: order.stageProgress,
    paymentId: order.paymentId,
    paymentStatus: order.paymentStatus,
    estimate: order.estimate,
    finalPriceVnd: order.finalPriceVnd,
    workerRuntimeSeconds: order.workerRuntimeSeconds,
    createdAt: order.createdAt,
    downloadUrl: order.status === 'finished' ? order.downloadUrl : null,
    durationSec: order.durationSec,
    resultSizeBytes: order.resultSizeBytes,
    isPlaceholder: order.isPlaceholder,
  };
}
