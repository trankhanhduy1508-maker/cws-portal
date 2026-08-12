import { Body, Controller, Header, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RoleGuard, Roles } from '../common/guards/role.guard';
import {
  IssueEnrollmentInput,
  RedeemEnrollmentInput,
  SiteBootstrapInput,
  AutomaticProvisionInput,
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

  @Post('site-bootstrap')
  @Header('Cache-Control', 'no-store')
  @UseGuards(RoleGuard)
  @Roles('admin')
  issueSiteBootstrap(@Body() body: SiteBootstrapInput, @Req() request: Request) {
    return this.enrollment.issueSiteBootstrap(body, request.staff!.userId);
  }

  @Post('provision')
  @Header('Cache-Control', 'no-store')
  provision(@Body() body: AutomaticProvisionInput) {
    return this.enrollment.provision(body);
  }

  @Post('redeem')
  @Header('Cache-Control', 'no-store')
  redeem(@Body() body: RedeemEnrollmentInput) {
    return this.enrollment.redeem(body);
  }
}
