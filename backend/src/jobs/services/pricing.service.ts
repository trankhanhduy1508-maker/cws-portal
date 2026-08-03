import { Injectable, Logger } from '@nestjs/common';
import { WorkerFleetGateway } from '../worker-fleet.gateway';

export const VND_PER_WORKER_HOUR = 6000;
export const FINAL_PRICE_MULTIPLIER = 2;
const WORKER_STARTUP_SECONDS = 10 * 60;

/**
 * Tính giá THẬT sau khi render xong, dựa trên runtime THẬT của từng
 * Worker đã tham gia job — KHÔNG dùng ước tính heuristic trước render
 * (`JobsService.estimate()` chỉ để hiển thị ETA/hàng đợi lúc chọn
 * Render Profile, KHÔNG phải giá cuối cùng khách phải trả — giá thật
 * chỉ tính tại `JobsService.approve()`, sau khi biết chắc job đã render
 * xong với runtime thật).
 *
 * Công thức: cộng dồn runtime của TỪNG task (claimedAt → lastHeartbeat),
 * cộng thêm 10 phút khởi động cho MỖI Worker khác nhau (không phải mỗi
 * task) → đổi ra giờ → x 6.000đ/giờ → x 2.
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly workerFleetGateway: WorkerFleetGateway) {}

  async computeFinalPriceVnd(
    internalJobId: string,
  ): Promise<{
    finalPriceVnd: number;
    workerRuntimeSeconds: number;
    workerCount: number;
  }> {
    const executions =
      await this.workerFleetGateway.getTaskExecutionDetails(internalJobId);

    if (executions.length === 0) {
      this.logger.warn(
        `computeFinalPriceVnd(${internalJobId}): không có dữ liệu claimed_at/worker_id — ` +
          'tính giá tối thiểu 1 Worker x thời gian khởi động để không chặn approve().',
      );
      const seconds = WORKER_STARTUP_SECONDS;
      return {
        finalPriceVnd: this.priceFromSeconds(seconds),
        workerRuntimeSeconds: seconds,
        workerCount: 1,
      };
    }

    // SỬA LỖI (phát hiện qua tự rà soát 31/07/2026): trước đây gộp
    // claimedAt/lastHeartbeat của MỌI task cùng 1 workerId thành 1
    // khoảng [min(claimedAt), max(lastHeartbeat)] DUY NHẤT cho cả job —
    // nếu 1 Worker nhận 2 task KHÔNG LIÊN TỤC của CÙNG job (hoàn toàn có
    // thể xảy ra, Worker poll job gần như ngẫu nhiên, có thể quay lại
    // job cũ sau khi đã làm việc khác), khoảng thời gian RẢNH giữa 2 lần
    // đó bị tính nhầm thành thời gian LÀM VIỆC THẬT, khiến khách hàng bị
    // tính tiền quá cao. Giờ cộng dồn runtime của TỪNG task riêng lẻ,
    // CHỈ cộng phí khởi động 1 lần cho MỖI Worker khác nhau (không phải
    // mỗi task) — phản ánh đúng "Worker khởi động 1 lần, có thể render
    // nhiều task rải rác trong job".
    const workerIdsSeen = new Set<string>();
    let totalTaskRuntimeSeconds = 0;

    for (const exec of executions) {
      const claimedAtMs = new Date(exec.claimedAt).getTime();
      // last_heartbeat là mốc gần đúng nhất Worker còn chạy task này mà
      // Backend đọc được — bảng `tasks` (Worker Fleet nội bộ) không có
      // cột completed_at riêng, không được sửa schema đó. Task xong quá
      // nhanh chưa kịp có heartbeat nào thì coi runtime = 0 cho task đó
      // thay vì bịa số.
      const endMs = exec.lastHeartbeat
        ? new Date(exec.lastHeartbeat).getTime()
        : claimedAtMs;

      totalTaskRuntimeSeconds += Math.max(0, (endMs - claimedAtMs) / 1000);
      workerIdsSeen.add(exec.workerId);
    }

    const totalSeconds =
      totalTaskRuntimeSeconds + workerIdsSeen.size * WORKER_STARTUP_SECONDS;

    return {
      finalPriceVnd: this.priceFromSeconds(totalSeconds),
      workerRuntimeSeconds: Math.round(totalSeconds),
      workerCount: workerIdsSeen.size,
    };
  }

  private priceFromSeconds(totalSeconds: number): number {
    const totalHours = totalSeconds / 3600;
    return Math.round(
      totalHours * VND_PER_WORKER_HOUR * FINAL_PRICE_MULTIPLIER,
    );
  }
}
