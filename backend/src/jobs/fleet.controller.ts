import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
}
