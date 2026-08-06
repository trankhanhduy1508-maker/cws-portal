import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  IRenderOrdersRepository,
  RENDER_ORDERS_REPOSITORY,
} from '../jobs/repositories/render-orders.repository.interface';
import { WorkerFleetGateway } from '../jobs/worker-fleet.gateway';
import { JobsService } from '../jobs/jobs.service';
import { JobStatus } from '../jobs/domain/job-status.enum';
import { RenderOrder } from '../jobs/domain/render-order';
import { PreviewService } from '../storage/preview.service';
import { StorageService } from '../storage/storage.service';
import { WakeService } from './wake/wake.service';

const TASK_EXPANSION_CHUNK_SIZE = 10;

/**
 * SchedulerService — chạy định kỳ (Cron), triển khai ĐÚNG 2 Model đã
 * chốt với Dy:
 *
 * Model 1 (ưu tiên tuyệt đối): Worker Fleet TỰ claim_task() các task đã
 * insert sẵn (WorkerFleetGateway.createInternalJobWithProbeTask, gọi
 * ngay lúc tạo order trong JobsService) — phần này KHÔNG cần bất kỳ
 * code Scheduler nào, Worker hiện tại đã tự làm đúng việc này.
 * SchedulerService chỉ ĐỌC LẠI trạng thái để cập nhật status tường
 * thuật cho khách xem (searching_workers/rendering/...).
 *
 * Model 2 (mở rộng, chỉ khi thiếu máy Online): nếu 1 order đứng yên ở
 * QUEUED/SEARCHING_WORKERS quá lâu mà không có Worker nào online, thử
 * gọi WakeService — nếu thất bại (hiện tại LUÔN thất bại, xem
 * NoopWakeProvider), tiếp tục nằm trong Queue, KHÔNG retry vô hạn,
 * KHÔNG làm gián đoạn các order khác.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly lastWakeAttemptAt = new Map<string, number>();
  private tickInFlight = false;
  private static readonly WAKE_RETRY_COOLDOWN_MS = 5 * 60 * 1000; // không thử Wake lại quá dày

  constructor(
    @Inject(RENDER_ORDERS_REPOSITORY)
    private readonly ordersRepository: IRenderOrdersRepository,
    private readonly workerFleetGateway: WorkerFleetGateway,
    private readonly jobsService: JobsService,
    private readonly previewService: PreviewService,
    private readonly storageService: StorageService,
    private readonly wakeService: WakeService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async tick(): Promise<void> {
    // A slow Supabase/API tick must not overlap the next cron invocation.
    // Overlap would multiply reads and status writes exactly when the system
    // is already under pressure.
    if (this.tickInFlight) {
      this.logger.warn('Bỏ qua scheduler tick chồng nhau');
      return;
    }
    this.tickInFlight = true;

    let activeOrders: RenderOrder[];
    try {
      activeOrders = await this.ordersRepository.findActiveOrders();
    } catch (err) {
      this.logger.error(`Không đọc được danh sách order đang xử lý: ${String(err)}`);
      this.tickInFlight = false;
      return;
    }

    try {
      // This value is a fleet-wide snapshot for state narration. Reading it
      // once per tick avoids one identical workers query per active order.
      const onlineWorkers = activeOrders.some((order) => order.internalJobId)
        ? await this.workerFleetGateway.countOnlineWorkers()
        : 0;
      let taskSnapshots: Map<string, {
        frameStart: number;
        frameEnd: number;
        status: string;
        lastLog: string | null;
        workerId: string | null;
      }[]> | null = null;
      try {
        taskSnapshots = await this.workerFleetGateway.getTasksForJobs(
          activeOrders
            .map((order) => order.internalJobId)
            .filter((id): id is string => Boolean(id)),
        );
      } catch (err) {
        // Keep the pre-batch per-order path available if a large batch query
        // hits a transient API/URL limit; one bad batch must not hide every
        // order's state transition.
        this.logger.error(`Batch task snapshot lỗi, fallback per order: ${String(err)}`);
      }

      for (const order of activeOrders) {
        try {
          await this.processOrder(
            order,
            onlineWorkers,
            order.internalJobId && taskSnapshots
              ? taskSnapshots.get(order.internalJobId)
              : undefined,
          );
        } catch (err) {
          // 1 order lỗi không được làm hỏng cả tick — log và tiếp tục
          // với order khác (đúng tinh thần "không làm gián đoạn hệ thống").
          this.logger.error(`processOrder(${order.id}) lỗi: ${String(err)}`);
        }
      }
    } finally {
      this.tickInFlight = false;
    }
  }

  private async processOrder(
    order: RenderOrder,
    onlineWorkersSnapshot?: number,
    taskSnapshot?: {
      frameStart: number;
      frameEnd: number;
      status: string;
      lastLog: string | null;
      workerId: string | null;
    }[],
  ): Promise<void> {
    if (!order.internalJobId) {
      this.logger.warn(`Order ${order.id} chưa có internalJobId — bỏ qua tick này`);
      return;
    }

    // Render đã xong từ trước, chỉ còn chờ webhook ngân hàng xác nhận
    // PAID (CWS_MVP_WORKFLOW_FINAL.md) — không cần đọc lại tasks Worker
    // Fleet nữa cho các order ở trạng thái này.
    if (order.status === JobStatus.AWAITING_PAYMENT) {
      const finalized = await this.jobsService.finalizeDelivery(order.id);
      if (finalized) {
        await this.storageService.notify(
          order.id,
          'Thanh toán thành công',
          `Job "${order.projectName}" đã thanh toán xong, file gốc đã sẵn sàng tải.`,
        );
        this.logger.log(`Order ${order.id}: thanh toán PAID, đã đóng gói + mở tải`);
      }
      return;
    }

    const internalJobId = order.internalJobId;
    const tasks = taskSnapshot ?? (await this.workerFleetGateway.getTasks(internalJobId));
    const onlineWorkers =
      onlineWorkersSnapshot ?? (await this.workerFleetGateway.countOnlineWorkers());

    // Bước 1: nếu probe task (frame 1-1) đã "done" và total_frames đã
    // biết, mà vẫn CHỈ có 1 task duy nhất — tự động tạo các task còn
    // lại (đúng việc Dy từng làm tay cho CWS-JOB5).
    const probeDone = tasks.length === 1 && tasks[0].status === 'done';
    if (probeDone) {
      const totalFrames = await this.workerFleetGateway.getTotalFrames(internalJobId);
      if (totalFrames && totalFrames > 1) {
        await this.workerFleetGateway.createRemainingTasks(
          internalJobId,
          2,
          totalFrames,
          TASK_EXPANSION_CHUNK_SIZE,
        );
        this.logger.log(
          `Order ${order.id}: đã tự tạo task cho frame 2..${totalFrames} (chunk=${TASK_EXPANSION_CHUNK_SIZE})`,
        );
        return; // đợi tick sau đọc lại danh sách task đầy đủ
      }
    }

    const anyActive = tasks.some((t) => t.status === 'active');
    const anyQueued = tasks.some((t) => t.status === 'queued');
    const anyFailed = tasks.some((t) => t.status === 'failed');
    const settled = tasks.length > 0 && !anyActive && !anyQueued; // không còn task nào Worker sẽ tự thử lại

    if (settled && anyFailed) {
      await this.markFailed(order, tasks);
      return;
    }

    const allDone = tasks.length > 0 && tasks.every((t) => t.status === 'done');
    if (allDone) {
      await this.moveToReview(order, internalJobId);
      return;
    }

    if (anyActive) {
      await this.updateStatus(order, JobStatus.RENDERING, this.computeProgress(tasks));
      return;
    }

    if (anyQueued && onlineWorkers > 0) {
      await this.updateStatus(order, JobStatus.ALLOCATING_WORKERS, 0);
      return;
    }

    if (anyQueued && onlineWorkers === 0) {
      await this.updateStatus(order, JobStatus.SEARCHING_WORKERS, 0);
      await this.maybeAttemptWake(order.id);
      return;
    }
  }

  private computeProgress(tasks: { status: string }[]): number {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.status === 'done').length;
    return done / tasks.length;
  }

  private async updateStatus(
    order: RenderOrder,
    status: JobStatus,
    stageProgress: number,
  ): Promise<void> {
    if (order.status === status) return; // tránh ghi Supabase thừa mỗi 10s nếu không đổi gì
    await this.ordersRepository.updateStatus(order.id, status, stageProgress);
  }

  private async maybeAttemptWake(orderId: string): Promise<void> {
    const lastAttempt = this.lastWakeAttemptAt.get(orderId) ?? 0;
    if (Date.now() - lastAttempt < SchedulerService.WAKE_RETRY_COOLDOWN_MS) return;

    this.lastWakeAttemptAt.set(orderId, Date.now());
    const result = await this.wakeService.tryWakeAnyCandidate();
    if (result.attempted) {
      this.logger.log(
        `Order ${orderId}: đã thử Wake — success=${result.success} reason=${result.reason ?? ''}`,
      );
    }
    // Nếu thất bại: KHÔNG retry ngay, order tiếp tục nằm ở
    // SEARCHING_WORKERS/Queue — đúng yêu cầu "Không retry vô hạn".
  }

  /**
   * Có task "failed" (Worker đã hết retry) và không còn task nào
   * active/queued — Worker Fleet sẽ không tự thử lại nữa. Báo lỗi cho
   * khách (CWS_ROADMAP_MVP_V1.md Giai đoạn 3: "Báo lỗi nếu có") thay vì
   * để order treo mãi ở trạng thái cũ không ai biết.
   */
  private async markFailed(
    order: RenderOrder,
    tasks: { status: string; lastLog: string | null; workerId: string | null }[],
  ): Promise<void> {
    if (order.status === JobStatus.ERROR || order.status === JobStatus.FINISHED) return;

    const failedTasks = tasks.filter((t) => t.status === 'failed');
    for (const task of failedTasks) {
      await this.storageService.logWorkerEvent(
        order.id,
        task.workerId,
        task.lastLog ?? 'Task thất bại, không có log chi tiết từ Worker',
        'error',
      );
    }

    await this.updateStatus(order, JobStatus.ERROR, order.stageProgress);
    await this.storageService.notify(
      order.id,
      'Render thất bại',
      `Job "${order.projectName}" gặp lỗi khi render và không thể tiếp tục. Vui lòng thử tạo lại job.`,
    );
    this.logger.error(`Order ${order.id}: ${failedTasks.length} task thất bại, chuyển sang ERROR`);
  }

  /**
   * Render xong (tất cả task done) — dừng ở REVIEW_READY, KHÔNG tự đóng
   * gói/mở link tải. CWS_ROADMAP_MVP_V1.md Giai đoạn 4: khách phải xem
   * qua 3-5 ảnh preview watermark và bấm duyệt (JobsService.approve())
   * trước khi có file cuối — đóng gói tự động ở đây là đúng lỗ hổng đã
   * bị phát hiện khi audit (final output lộ ra không qua cổng duyệt nào).
   */
  private async moveToReview(order: RenderOrder, internalJobId: string): Promise<void> {
    if (
      order.status === JobStatus.REVIEW_READY ||
      order.status === JobStatus.PACKAGING ||
      order.status === JobStatus.FINISHED
    ) {
      return;
    }

    await this.previewService.generateReviewPreview(internalJobId, order.id);
    await this.updateStatus(order, JobStatus.REVIEW_READY, 1);
    await this.storageService.notify(
      order.id,
      'Render xong, mời bạn duyệt',
      `Job "${order.projectName}" đã render xong. Xem 3-5 ảnh xem trước và bấm duyệt để mở tải file gốc.`,
    );

    this.logger.log(`Order ${order.id}: render xong, đã tạo preview — chờ khách duyệt`);
  }
}
