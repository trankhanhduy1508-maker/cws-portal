import { RenderOrder } from '../domain/render-order';
import { JobStatus } from '../domain/job-status.enum';

/**
 * Interface thuần — tầng application/domain chỉ biết tới interface
 * này, KHÔNG biết Supabase là gì. Việc này cho phép sau này đổi sang
 * Postgres thuần, hay bất kỳ store nào khác, chỉ cần viết 1
 * implementation mới, không sửa JobsService.
 */
export const RENDER_ORDERS_REPOSITORY = Symbol('RENDER_ORDERS_REPOSITORY');

export interface IRenderOrdersRepository {
  create(order: RenderOrder): Promise<RenderOrder>;
  findById(id: string): Promise<RenderOrder | null>;
  findAll(): Promise<RenderOrder[]>;
  updateStatus(
    id: string,
    status: JobStatus,
    stageProgress: number,
  ): Promise<RenderOrder | null>;
  updateResult(
    id: string,
    result: {
      downloadUrl: string | null;
      durationSec: number | null;
      resultSizeBytes: number | null;
      isPlaceholder: boolean;
    },
  ): Promise<RenderOrder | null>;
  markCancelled(id: string): Promise<RenderOrder | null>;
  attachInternalJobId(id: string, internalJobId: string): Promise<void>;
  /** Các order đang ở trạng thái "chưa xong việc" — Scheduler dùng để
   * quét định kỳ (Model 1/2 quyết định bước tiếp theo). */
  findActiveOrders(): Promise<RenderOrder[]>;
}
