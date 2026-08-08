import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WorkerAuthGuard } from './worker-auth.guard';
import {
  WorkerStorageCapabilityRequest,
  WorkerStorageCapabilityService,
} from './worker-storage-capability.service';

@Controller('worker/storage-capability')
@UseGuards(WorkerAuthGuard)
export class WorkerStorageCapabilityController {
  constructor(private readonly service: WorkerStorageCapabilityService) {}

  @Post()
  issue(@Body() body: WorkerStorageCapabilityRequest, @Req() request: Request) {
    return this.service.issue(
      request.workerIdentity!.workerId,
      body ?? ({} as WorkerStorageCapabilityRequest),
    );
  }
}
