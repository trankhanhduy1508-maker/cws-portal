import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
