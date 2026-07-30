import { Injectable, Logger } from '@nestjs/common';
import { WorkerFleetGateway } from '../worker-fleet.gateway';

const VND_PER_WORKER_HOUR = 6000;
const FINAL_PRICE_MULTIPLIER = 2;
const WORKER_STARTUP_SECONDS = 10 * 60;

/**
 * Tính giá THẬT sau khi render xong, dựa trên runtime THẬT của từng
 * Worker đã tham gia job — KHÔNG dùng ước tính heuristic trước render
 * (`JobsService.estimate()` chỉ để hiển thị ETA/hàng đợi lúc chọn
 * Render Profile, KHÔNG phải giá cuối cùng khách phải trả — giá thật
 * chỉ tính tại `JobsService.approve()`, sau khi biết chắc job đã render
 * xong với runtime thật).
 *
 * Công thức: mỗi Worker (runtime + 10 phút khởi động) → cộng dồn mọi
 * Worker → đổi ra giờ → x 6.000đ/giờ → x 2.
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly workerFleetGateway: WorkerFleetGateway) {}

  async computeFinalPriceVnd(
    internalJobId: string,
  ): Promise<{ finalPriceVnd: number; workerRuntimeSeconds: number }> {
    const executions = await this.workerFleetGateway.getTaskExecutionDetails(internalJobId);

    const byWorker = new Map<string, { start: number; end: number }>();
    for (const exec of executions) {
      const claimedAtMs = new Date(exec.claimedAt).getTime();
      // last_heartbeat là mốc gần đúng nhất Worker còn chạy task này mà
      // Backend đọc được — bảng `tasks` (Worker Fleet nội bộ) không có
      // cột completed_at riêng, không được sửa schema đó. Task xong quá
      // nhanh chưa kịp có heartbeat nào thì coi runtime = 0 cho task đó
      // thay vì bịa số.
      const endMs = exec.lastHeartbeat ? new Date(exec.lastHeartbeat).getTime() : claimedAtMs;

      const existing = byWorker.get(exec.workerId);
      if (!existing) {
        byWorker.set(exec.workerId, { start: claimedAtMs, end: endMs });
      } else {
        existing.start = Math.min(existing.start, claimedAtMs);
        existing.end = Math.max(existing.end, endMs);
      }
    }

    if (byWorker.size === 0) {
      this.logger.warn(
        `computeFinalPriceVnd(${internalJobId}): không có dữ liệu claimed_at/worker_id — ` +
          'tính giá tối thiểu 1 Worker x thời gian khởi động để không chặn approve().',
      );
      const seconds = WORKER_STARTUP_SECONDS;
      return { finalPriceVnd: this.priceFromSeconds(seconds), workerRuntimeSeconds: seconds };
    }

    let totalSeconds = 0;
    for (const { start, end } of byWorker.values()) {
      const runtimeSeconds = Math.max(0, (end - start) / 1000);
      totalSeconds += runtimeSeconds + WORKER_STARTUP_SECONDS;
    }

    return {
      finalPriceVnd: this.priceFromSeconds(totalSeconds),
      workerRuntimeSeconds: Math.round(totalSeconds),
    };
  }

  private priceFromSeconds(totalSeconds: number): number {
    const totalHours = totalSeconds / 3600;
    return Math.round(totalHours * VND_PER_WORKER_HOUR * FINAL_PRICE_MULTIPLIER);
  }
}
