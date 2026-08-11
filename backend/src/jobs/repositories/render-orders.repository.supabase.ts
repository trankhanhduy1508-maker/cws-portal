import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { IRenderOrdersRepository } from './render-orders.repository.interface';
import { RenderOrder } from '../domain/render-order';
import { JobStatus } from '../domain/job-status.enum';

const TABLE = 'render_orders';

interface RenderOrderRow {
  id: string;
  project_name: string;
  software: string | null;
  software_version: string | null;
  notes: string | null;
  storage_code: string;
  customer_id: string | null;
  status: string;
  stage_progress: number;
  payment_id: string | null;
  payment_status: string;
  estimate_eta_seconds: number;
  estimate_cost_vnd: number;
  estimate_queue_seconds: number;
  final_price_vnd: number | null;
  worker_runtime_seconds: number | null;
  drive_link: string | null;
  uploaded_file_b2_key: string | null;
  file_size_bytes: number | null;
  internal_job_id: string | null;
  created_at: string;
  download_url: string | null;
  duration_sec: number | null;
  result_size_bytes: number | null;
  is_placeholder: boolean;
  idempotency_key: string | null;
  request_fingerprint: string | null;
}

function rowToDomain(row: RenderOrderRow): RenderOrder {
  return {
    id: row.id,
    projectName: row.project_name,
    software: row.software,
    softwareVersion: row.software_version,
    notes: row.notes,
    storageCode: row.storage_code,
    customerId: row.customer_id,
    status: row.status as JobStatus,
    stageProgress: row.stage_progress,
    paymentId: row.payment_id,
    paymentStatus: row.payment_status as RenderOrder['paymentStatus'],
    estimate: {
      etaSeconds: row.estimate_eta_seconds,
      costVnd: row.estimate_cost_vnd,
      queueSeconds: row.estimate_queue_seconds,
    },
    finalPriceVnd: row.final_price_vnd,
    workerRuntimeSeconds: row.worker_runtime_seconds,
    driveLink: row.drive_link,
    uploadedFileB2Key: row.uploaded_file_b2_key,
    fileSizeBytes: row.file_size_bytes,
    internalJobId: row.internal_job_id,
    createdAt: new Date(row.created_at).getTime(),
    downloadUrl: row.download_url,
    durationSec: row.duration_sec,
    resultSizeBytes: row.result_size_bytes,
    isPlaceholder: row.is_placeholder,
    idempotencyKey: row.idempotency_key,
    requestFingerprint: row.request_fingerprint,
  };
}

function domainToInsertRow(
  order: RenderOrder,
): Omit<RenderOrderRow, 'created_at'> {
  return {
    id: order.id,
    project_name: order.projectName,
    software: order.software,
    software_version: order.softwareVersion,
    notes: order.notes,
    storage_code: order.storageCode,
    customer_id: order.customerId,
    status: order.status,
    stage_progress: order.stageProgress,
    payment_id: order.paymentId,
    payment_status: order.paymentStatus,
    estimate_eta_seconds: order.estimate.etaSeconds,
    estimate_cost_vnd: order.estimate.costVnd,
    estimate_queue_seconds: order.estimate.queueSeconds,
    final_price_vnd: order.finalPriceVnd,
    worker_runtime_seconds: order.workerRuntimeSeconds,
    drive_link: order.driveLink,
    uploaded_file_b2_key: order.uploadedFileB2Key,
    file_size_bytes: order.fileSizeBytes,
    internal_job_id: order.internalJobId,
    download_url: order.downloadUrl,
    duration_sec: order.durationSec,
    result_size_bytes: order.resultSizeBytes,
    is_placeholder: order.isPlaceholder,
    idempotency_key: order.idempotencyKey ?? null,
    request_fingerprint: order.requestFingerprint ?? null,
  };
}

@Injectable()
export class SupabaseRenderOrdersRepository implements IRenderOrdersRepository {
  private readonly logger = new Logger(SupabaseRenderOrdersRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(order: RenderOrder): Promise<RenderOrder> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .insert(domainToInsertRow(order))
      .select()
      .single();

    if (error) {
      this.logger.error(`create() thất bại: ${error.message}`);
      throw new Error(`Không tạo được render order: ${error.message}`);
    }
    return rowToDomain(data as RenderOrderRow);
  }

  async findById(id: string): Promise<RenderOrder | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`findById(${id}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được render order: ${error.message}`);
    }
    return data ? rowToDomain(data as RenderOrderRow) : null;
  }

  async findByIdempotencyKey(key: string): Promise<RenderOrder | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();
    if (error) {
      this.logger.error(`findByIdempotencyKey() thất bại: ${error.message}`);
      throw new Error(`Không đọc được idempotency key: ${error.message}`);
    }
    return data ? rowToDomain(data as RenderOrderRow) : null;
  }

  async findAll(): Promise<RenderOrder[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`findAll() thất bại: ${error.message}`);
      throw new Error(
        `Không đọc được danh sách render order: ${error.message}`,
      );
    }
    return (data as RenderOrderRow[]).map(rowToDomain);
  }

  async updateStatus(
    id: string,
    status: JobStatus,
    stageProgress: number,
  ): Promise<RenderOrder | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update({ status, stage_progress: stageProgress })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(`updateStatus(${id}) thất bại: ${error.message}`);
      throw new Error(
        `Không cập nhật được trạng thái render order: ${error.message}`,
      );
    }
    return data ? rowToDomain(data as RenderOrderRow) : null;
  }

  async updateResult(
    id: string,
    result: {
      downloadUrl: string | null;
      durationSec: number | null;
      resultSizeBytes: number | null;
      isPlaceholder: boolean;
    },
  ): Promise<RenderOrder | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update({
        status: JobStatus.FINISHED,
        stage_progress: 1,
        download_url: result.downloadUrl,
        duration_sec: result.durationSec,
        result_size_bytes: result.resultSizeBytes,
        is_placeholder: result.isPlaceholder,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(`updateResult(${id}) thất bại: ${error.message}`);
      throw new Error(
        `Không cập nhật được kết quả render order: ${error.message}`,
      );
    }
    return data ? rowToDomain(data as RenderOrderRow) : null;
  }

  async updateLockedResult(
    id: string,
    result: {
      downloadUrl: string;
      durationSec: number;
      resultSizeBytes: number;
    },
  ): Promise<RenderOrder | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update({
        download_url: result.downloadUrl,
        duration_sec: result.durationSec,
        result_size_bytes: result.resultSizeBytes,
        is_placeholder: false,
      })
      .eq('id', id)
      .in('status', [JobStatus.RENDERING, JobStatus.REVIEW_READY, JobStatus.AWAITING_PAYMENT])
      .select()
      .maybeSingle();
    if (error) {
      this.logger.error(`updateLockedResult(${id}) thất bại: ${error.message}`);
      throw new Error(`Không lưu được final output bị khoá: ${error.message}`);
    }
    return data ? rowToDomain(data as RenderOrderRow) : null;
  }

  async unlockResult(id: string): Promise<RenderOrder | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update({ status: JobStatus.FINISHED, stage_progress: 1 })
      .eq('id', id)
      .eq('status', JobStatus.AWAITING_PAYMENT)
      .not('download_url', 'is', null)
      .select()
      .maybeSingle();
    if (error) {
      this.logger.error(`unlockResult(${id}) thất bại: ${error.message}`);
      throw new Error(`Không mở khoá final output: ${error.message}`);
    }
    return data ? rowToDomain(data as RenderOrderRow) : null;
  }

  async markCancelled(id: string): Promise<RenderOrder | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update({ status: JobStatus.CANCELLED })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(`markCancelled(${id}) thất bại: ${error.message}`);
      throw new Error(`Không hủy được render order: ${error.message}`);
    }
    return data ? rowToDomain(data as RenderOrderRow) : null;
  }

  async attachInternalJobId(id: string, internalJobId: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update({ internal_job_id: internalJobId })
      .eq('id', id);

    if (error) {
      this.logger.error(
        `attachInternalJobId(${id}) thất bại: ${error.message}`,
      );
      throw new Error(`Không gắn được internal_job_id: ${error.message}`);
    }
  }

  async attachPayment(
    id: string,
    paymentId: string,
    finalPriceVnd: number,
    workerRuntimeSeconds: number,
  ): Promise<RenderOrder | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update({
        payment_id: paymentId,
        payment_status: 'processing',
        status: JobStatus.AWAITING_PAYMENT,
        stage_progress: 0,
        final_price_vnd: finalPriceVnd,
        worker_runtime_seconds: workerRuntimeSeconds,
      })
      .eq('id', id)
      .eq('status', JobStatus.REVIEW_READY)
      .is('payment_id', null)
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(`attachPayment(${id}) thất bại: ${error.message}`);
      throw new Error(
        `Không gắn được payment vào render order: ${error.message}`,
      );
    }
    return data ? rowToDomain(data as RenderOrderRow) : null;
  }

  async markPaymentPaid(id: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update({ payment_status: 'paid' })
      .eq('id', id);

    if (error) {
      this.logger.error(`markPaymentPaid(${id}) thất bại: ${error.message}`);
      throw new Error(`Không cập nhật được payment_status: ${error.message}`);
    }
  }

  async findByStorageCode(storageCode: string): Promise<RenderOrder | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('storage_code', storageCode)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `findByStorageCode(${storageCode}) thất bại: ${error.message}`,
      );
      throw new Error(
        `Không đọc được render order theo storage code: ${error.message}`,
      );
    }
    return data ? rowToDomain(data as RenderOrderRow) : null;
  }

  async findActiveOrders(): Promise<RenderOrder[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .not(
        'status',
        'in',
        `(${JobStatus.FINISHED},${JobStatus.ERROR},${JobStatus.CANCELLED})`,
      );

    if (error) {
      this.logger.error(`findActiveOrders() thất bại: ${error.message}`);
      throw new Error(
        `Không đọc được danh sách order đang xử lý: ${error.message}`,
      );
    }
    return (data as RenderOrderRow[]).map(rowToDomain);
  }

  async findByCustomerId(customerId: string): Promise<RenderOrder[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(
        `findByCustomerId(${customerId}) thất bại: ${error.message}`,
      );
      throw new Error(
        `Không đọc được danh sách render order theo customer: ${error.message}`,
      );
    }
    return (data as RenderOrderRow[]).map(rowToDomain);
  }
}
