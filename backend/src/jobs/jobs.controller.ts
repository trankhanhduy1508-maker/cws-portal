import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JobsService } from './jobs.service';
import { CreateJobDto, EstimateJobDto } from './dto/create-job.dto';
import { toPublicJson } from './render-order.presenter';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async create(@Body() dto: CreateJobDto, @Req() req: AuthenticatedRequest) {
    return this.jobsService.createOrder(dto, req.user.userId);
  }

  @Post('estimate')
  @HttpCode(200)
  async estimate(@Body() dto: EstimateJobDto) { return this.jobsService.estimate(dto); }

  @Get()
  async listAll(@Req() req: AuthenticatedRequest) { return (await this.jobsService.listAll(req.user)).map(toPublicJson); }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return toPublicJson(await this.jobsService.getById(id, req.user)); }

  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const order = await this.jobsService.getById(id, req.user);
    return { status: order.status, stageProgress: order.stageProgress };
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancelViaPost(@Param('id') id: string, @Req() req: AuthenticatedRequest) { await this.jobsService.cancel(id, req.user); return { ok: true }; }

  @Delete(':id')
  @HttpCode(200)
  async cancelViaDelete(@Param('id') id: string, @Req() req: AuthenticatedRequest) { await this.jobsService.cancel(id, req.user); return { ok: true }; }
}
