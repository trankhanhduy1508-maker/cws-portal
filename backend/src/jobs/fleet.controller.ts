import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkerFleetGateway } from './worker-fleet.gateway';
import { AdminKeyGuard } from '../common/guards/admin-key.guard';

/** Admin theo dõi "Worker" (CWS_MVP_WORKFLOW_FINAL.md, mục Admin) — CHỈ
 * đọc trạng thái Worker Fleet, KHÔNG can thiệp gì (đúng nguyên tắc
 * "không đụng Worker Fleet"). Route riêng ngoài `/jobs` để không xung
 * đột với route `:id` của JobsController. */
@Controller('fleet')
export class FleetController {
  constructor(private readonly workerFleetGateway: WorkerFleetGateway) {}

  @Get('workers')
  @UseGuards(AdminKeyGuard)
  async listWorkers() {
    return this.workerFleetGateway.listWorkers();
  }

  /** Phase 6 CWS_WORKER_ROADMAP.md — danh sách sự cố, CHỈ đọc. */
  @Get('incidents')
  @UseGuards(AdminKeyGuard)
  async listIncidents(
    @Query('workerId') workerId?: string,
    @Query('severity') severity?: string,
    @Query('resolved') resolved?: string,
  ) {
    return this.workerFleetGateway.listIncidents({
      workerId,
      severity,
      resolved:
        resolved === 'true' ? true : resolved === 'false' ? false : undefined,
    });
  }

  /** Phase 8 CWS_WORKER_ROADMAP.md — thống kê thời gian/tiền thuê host, CHỈ đọc. */
  @Get('host-usage')
  @UseGuards(AdminKeyGuard)
  async listHostUsageSessions() {
    return this.workerFleetGateway.listHostUsageSessions();
  }

  /** Hành động Admin (ngoài roadmap, đóng lỗ hổng Phase 6) — 4 route dưới
   * đây đều là hành động THẬT lên Worker Fleet (không chỉ đọc), xem chi
   * tiết ranh giới an toàn trong `WorkerFleetGateway` và
   * `worker_migrations/008_admin_worker_actions.sql`. */
  @Post('tasks/:taskId/retry')
  @UseGuards(AdminKeyGuard)
  async retryTask(@Param('taskId') taskId: string) {
    const ok = await this.workerFleetGateway.adminRetryTask(Number(taskId));
    return { ok };
  }

  @Post('tasks/:taskId/requeue')
  @UseGuards(AdminKeyGuard)
  async requeueTask(@Param('taskId') taskId: string) {
    const ok = await this.workerFleetGateway.adminRequeueTask(Number(taskId));
    return { ok };
  }

  @Post('workers/:workerId/quarantine')
  @UseGuards(AdminKeyGuard)
  async quarantineWorker(
    @Param('workerId') workerId: string,
    @Body() body: { quarantined: boolean; reason?: string },
  ) {
    const ok = await this.workerFleetGateway.adminSetWorkerQuarantine(
      workerId,
      body.quarantined,
      body.reason,
    );
    return { ok };
  }

  @Post('workers/:workerId/drain')
  @UseGuards(AdminKeyGuard)
  async drainWorker(
    @Param('workerId') workerId: string,
    @Body() body: { draining: boolean; reason?: string },
  ) {
    const ok = await this.workerFleetGateway.adminSetWorkerDrain(
      workerId,
      body.draining,
      body.reason,
    );
    return { ok };
  }

  /** Phase 8 CWS_WORKER_ROADMAP.md — xác nhận final_amount, hành động
   * DUY NHẤT ghi số tiền cuối cùng (Worker/hệ thống tự động không tự
   * quyết định số này). */
  @Post('host-usage/:sessionId/confirm-final-amount')
  @UseGuards(AdminKeyGuard)
  async confirmHostUsageFinalAmount(
    @Param('sessionId') sessionId: string,
    @Body() body: { finalAmount: number },
  ) {
    const ok = await this.workerFleetGateway.adminConfirmHostUsageFinalAmount(
      Number(sessionId),
      body.finalAmount,
    );
    return { ok };
  }
}
