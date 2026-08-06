import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WorkerAuthGuard } from './worker-auth.guard';
import { WorkerRpcService } from './worker-rpc.service';

@Controller('worker/rpc')
@UseGuards(WorkerAuthGuard)
export class WorkerRpcController {
  constructor(private readonly workerRpcService: WorkerRpcService) {}

  @Post(':operation')
  call(@Param('operation') operation: string, @Body() body: Record<string, unknown>, @Req() request: Request) {
    return this.workerRpcService.call(operation, request.workerIdentity!.workerId, body ?? {});
  }
}
