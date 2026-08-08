import { Body, Controller, Header, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RoleGuard, Roles } from '../common/guards/role.guard';
import {
  IssueEnrollmentInput,
  RedeemEnrollmentInput,
  WorkerEnrollmentService,
} from './worker-enrollment.service';

@Controller('worker/enrollment')
export class WorkerEnrollmentController {
  constructor(private readonly enrollment: WorkerEnrollmentService) {}

  @Post('tickets')
  @Header('Cache-Control', 'no-store')
  @UseGuards(RoleGuard)
  @Roles('admin')
  issue(@Body() body: IssueEnrollmentInput, @Req() request: Request) {
    return this.enrollment.issueBatch(body, request.staff!.userId);
  }

  @Post('redeem')
  @Header('Cache-Control', 'no-store')
  redeem(@Body() body: RedeemEnrollmentInput) {
    return this.enrollment.redeem(body);
  }
}
