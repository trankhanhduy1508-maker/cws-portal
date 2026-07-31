import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { WorkerFleetGateway } from './worker-fleet.gateway';
import { RoleGuard, Roles } from '../common/guards/role.guard';

/** Host Dashboard MVP (Phần 6) — CHỈ đọc, lọc chặt theo worker_id mà
 * chính Host này được cấp qua staff_worker_access (migration 013,
 * RoleGuard gắn sẵn vào req.staff.workerIds). Tái dùng nguyên
 * WorkerFleetGateway.listWorkers/listIncidents/listHostUsageSessions
 * (đã dùng cho AdminScreen) — KHÔNG sửa gateway, chỉ lọc kết quả ở đây
 * để Host không bao giờ thấy dữ liệu của Host khác. */
@Controller('host')
@UseGuards(RoleGuard)
@Roles('host')
export class HostController {
  constructor(private readonly workerFleetGateway: WorkerFleetGateway) {}

  @Get('dashboard')
  async dashboard(@Req() req: Request) {
    const workerIds = new Set(req.staff!.workerIds);

    const [workers, incidents, hostUsageSessions] = await Promise.all([
      this.workerFleetGateway.listWorkers(),
      this.workerFleetGateway.listIncidents({ limit: 50 }),
      this.workerFleetGateway.listHostUsageSessions(),
    ]);

    return {
      workers: workers.filter((w) => workerIds.has(w.workerId)),
      incidents: incidents.filter(
        (i) => i.workerId !== null && workerIds.has(i.workerId),
      ),
      hostUsageSessions: hostUsageSessions.filter(
        (s) => s.workerId !== null && workerIds.has(s.workerId),
      ),
    };
  }
}
