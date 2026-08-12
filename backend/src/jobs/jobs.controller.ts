import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { toPublicJson } from './render-order.presenter';
import { getOptionalCustomerId } from '../common/optional-auth.util';
import { SupabaseService } from '../supabase/supabase.service';
import { RoleGuard } from '../common/guards/role.guard';
import { isAuthenticatedMfaAdmin } from '../common/guards/staff-auth.util';
import { MvpRateLimitGuard } from '../common/guards/mvp-rate-limit.guard';
import { RequestChangesDto } from './dto/request-changes.dto';
import { getInputFormat } from '../files/input-file.util';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InputUploadsService } from '../files/input-uploads.service';
import { GoogleDriveService } from '../files/google-drive.service';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly supabaseService: SupabaseService,
    private readonly inputUploadsService?: InputUploadsService,
    private readonly googleDriveService?: GoogleDriveService,
  ) {}

  private async isAdminRequest(req: Request): Promise<boolean> {
    return isAuthenticatedMfaAdmin(req, this.supabaseService);
  }

  @Post()
  @UseGuards(JwtAuthGuard, MvpRateLimitGuard)
  async create(@Body() dto: CreateJobDto, @Req() req: Request) {
    if (dto.fileRef && dto.fileName && !getInputFormat(dto.fileName)) {
      throw new BadRequestException('Chỉ hỗ trợ file .blend, .zip hoặc .rar');
    }
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    if (!customerId)
      throw new UnauthorizedException('Cần đăng nhập để tạo job');

    if (dto.driveLink && !dto.fileRef) {
      if (!this.googleDriveService || !this.inputUploadsService) {
        throw new UnauthorizedException('Google Drive import chưa được cấu hình');
      }
      throw new BadRequestException('Google Drive must pass the input security pipeline before job creation');
    }
    if (dto.fileRef) {
      if (!this.inputUploadsService) {
        throw new UnauthorizedException('Upload ownership chưa được cấu hình');
      }
      await this.inputUploadsService.assertOwned(dto.fileRef, customerId);
      await this.inputUploadsService.assertInputSafe(dto.fileRef, customerId);
    }
    const idempotencyKey = req.header('Idempotency-Key');
    return this.jobsService.createOrder(dto, customerId, idempotencyKey);
  }

  @Get()
  async listAll(@Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    if (await this.isAdminRequest(req)) {
      const orders = await this.jobsService.listAll(null);
      return orders.map(toPublicJson);
    }
    if (customerId) {
      const orders = await this.jobsService.listAll(customerId);
      return orders.map(toPublicJson);
    }
    throw new UnauthorizedException('Cần đăng nhập để xem danh sách job');
  }

  @Get('by-storage-code/:storageCode')
  @UseGuards(RoleGuard)
  async getByStorageCode(@Param('storageCode') storageCode: string) {
    const order = await this.jobsService.getByStorageCode(storageCode);
    return toPublicJson(order);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    const order = await this.jobsService.getByIdForCustomer(
      id,
      customerId,
      await this.isAdminRequest(req),
    );
    return toPublicJson(order);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    const order = await this.jobsService.getByIdForCustomer(
      id,
      customerId,
      await this.isAdminRequest(req),
    );
    return { status: order.status, stageProgress: order.stageProgress };
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancelViaPost(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    await this.jobsService.cancel(id, customerId, await this.isAdminRequest(req));
    return { ok: true };
  }

  @Get(':id/preview')
  async getPreview(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    const images = await this.jobsService.getReviewImages(
      id,
      customerId,
      await this.isAdminRequest(req),
    );
    return { images };
  }

  @Post(':id/approve')
  @HttpCode(200)
  async approve(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    const { order, payment } = await this.jobsService.approve(
      id,
      customerId,
      await this.isAdminRequest(req),
    );
    return { ...toPublicJson(order), payment };
  }

  @Post(':id/request-changes')
  @HttpCode(200)
  async requestChanges(
    @Param('id') id: string,
    @Body() body: RequestChangesDto,
    @Req() req: Request,
  ) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    await this.jobsService.requestChanges(
      id,
      body?.note ?? null,
      customerId,
      await this.isAdminRequest(req),
    );
    return { ok: true };
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      null;
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    const url = await this.jobsService.getDownloadRedirectUrl(
      id,
      ip,
      customerId,
      await this.isAdminRequest(req),
    );
    res.redirect(302, url);
  }

  @Get(':id/logs')
  async getLogs(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    const logs = await this.jobsService.getWorkerLogs(
      id,
      customerId,
      await this.isAdminRequest(req),
    );
    return { logs };
  }

  @Get(':id/notifications')
  async getNotifications(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    const notifications = await this.jobsService.getNotifications(
      id,
      customerId,
      await this.isAdminRequest(req),
    );
    return { notifications };
  }

  @Delete(':id')
  @HttpCode(200)
  async cancelViaDelete(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    await this.jobsService.cancel(id, customerId, await this.isAdminRequest(req));
    return { ok: true };
  }
}
