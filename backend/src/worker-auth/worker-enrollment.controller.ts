import { Body, Controller, Header, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RoleGuard, Roles } from '../common/guards/role.guard';
import {
  IssueEnrollmentInput,
  RedeemEnrollmentInput,
  SiteBootstrapInput,
  SiteControllerApprovalInput,
  SiteControllerCapabilityInput,
  SiteControllerStatusInput,
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
  issueSiteBootstrap(
    @Body() body: SiteBootstrapInput,
    @Req() request: Request,
  ) {
    return this.enrollment.issueSiteBootstrap(body, request.staff!.userId);
  }

  @Post('site-controller/approve')
  @Header('Cache-Control', 'no-store')
  @UseGuards(RoleGuard)
  @Roles('admin')
  approveSiteController(
    @Body() body: SiteControllerApprovalInput,
    @Req() request: Request,
  ) {
    return this.enrollment.approveSiteController(body, request.staff!.userId);
  }

  @Post('site-controller/status')
  @Header('Cache-Control', 'no-store')
  @UseGuards(RoleGuard)
  @Roles('admin')
  setSiteControllerStatus(
    @Body() body: SiteControllerStatusInput,
    @Req() request: Request,
  ) {
    return this.enrollment.setSiteControllerStatus(body, request.staff!.userId);
  }

  @Post('site-controller/capability')
  @Header('Cache-Control', 'no-store')
  issueSiteControllerCapability(@Body() body: SiteControllerCapabilityInput) {
    return this.enrollment.issueSiteControllerCapability(body);
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
