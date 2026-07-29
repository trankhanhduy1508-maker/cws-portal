import { BadRequestException } from '@nestjs/common';
import { JobStatus } from '../jobs/domain/job-status.enum';

const PAYMENT_STATUSES = new Set([
  'awaiting_transfer', 'under_review', 'confirmed', 'original_unlocked',
  'expired', 'underpaid', 'overpaid', 'rejected', 'refund_pending', 'refunded',
]);
const JOB_STATUSES = new Set(Object.values(JobStatus));

export interface OperationsQuery {
  page: number;
  pageSize: number;
  search: string;
  jobStatus?: string;
  paymentStatus?: string;
}

export function parseOperationsQuery(raw: Record<string, string | undefined>): OperationsQuery {
  const page = Number(raw.page ?? 1);
  const pageSize = Number(raw.pageSize ?? 25);
  if (!Number.isInteger(page) || page < 1) throw new BadRequestException('page không hợp lệ');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new BadRequestException('pageSize phải từ 1 đến 100');
  }
  if (raw.jobStatus && !JOB_STATUSES.has(raw.jobStatus)) {
    throw new BadRequestException('jobStatus không hợp lệ');
  }
  if (raw.paymentStatus && !PAYMENT_STATUSES.has(raw.paymentStatus)) {
    throw new BadRequestException('paymentStatus không hợp lệ');
  }
  return {
    page,
    pageSize,
    search: (raw.search ?? '').trim().slice(0, 100),
    jobStatus: raw.jobStatus || undefined,
    paymentStatus: raw.paymentStatus || undefined,
  };
}
