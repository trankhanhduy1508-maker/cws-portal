import { JobStatus } from './job-status.enum';

/** Internal queue/ETA snapshot retained for operational compatibility. */
export interface JobEstimate {
  etaSeconds: number;
  costVnd: number;
  queueSeconds: number;
}

/**
 * Customer-facing render order. Worker Fleet task ownership remains in the
 * internal jobs/tasks tables. Customer does not select a render tier or
 * hardware; Scheduler owns capacity decisions.
 */
export interface RenderOrder {
  id: string;
  projectName: string;
  software: string | null;
  softwareVersion: string | null;
  notes: string | null;
  storageCode: string;
  customerId: string | null;
  status: JobStatus;
  stageProgress: number;

  paymentId: string | null;
  paymentStatus: 'unpaid' | 'processing' | 'paid' | 'failed';

  estimate: JobEstimate;
  finalPriceVnd: number | null;
  workerRuntimeSeconds: number | null;

  driveLink: string | null;
  uploadedFileB2Key: string | null;
  fileSizeBytes: number | null;
  internalJobId: string | null;

  createdAt: number;
  downloadUrl: string | null;
  durationSec: number | null;
  resultSizeBytes: number | null;
  isPlaceholder: boolean;

  idempotencyKey?: string | null;
  requestFingerprint?: string | null;
}

export interface CreateRenderOrderInput {
  fileRef: string | null;
  driveLink: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  software: string | null;
  softwareVersion: string | null;
  notes: string | null;
}
