import {
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
import { CreateJobDto, EstimateJobDto } from './dto/create-job.dto';
import { toPublicJson } from './render-order.presenter';
import { getOptionalCustomerId } from '../common/optional-auth.util';
import { SupabaseService } from '../supabase/supabase.service';
import { AdminKeyGuard, isValidAdminKey } from '../common/guards/admin-key.guard';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Post()
  async create(@Body() dto: CreateJobDto, @Req() req: Request) {
    // Gắn customerId NẾU khách đã đăng nhập Facebook qua Supabase Auth
    // (Bearer token hợp lệ) — KHÔNG bắt buộc, job vẫn tạo được cho khách
    // chưa đăng nhập (xem lý do ở jwt-auth.guard.ts).
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    return this.jobsService.createOrder(dto, customerId);
  }

  @Post('estimate')
  @HttpCode(200)
  async estimate(@Body() dto: EstimateJobDto) {
    return this.jobsService.estimate(dto);
  }

  /** Khách đã đăng nhập: chỉ thấy job của mình. Khách CHƯA đăng nhập:
   * phải có x-admin-key mới xem được TOÀN BỘ job của mọi khách — trước
   * đây route này công khai hoàn toàn, ai gọi cũng thấy hết. */
  @Get()
  async listAll(@Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    if (customerId) {
      const orders = await this.jobsService.listAll(customerId);
      return orders.map(toPublicJson);
    }

    const adminApiKey = this.configService.get('adminApiKey', { infer: true });
    if (!isValidAdminKey(req, adminApiKey)) {
      throw new UnauthorizedException('Cần đăng nhập hoặc x-admin-key để xem danh sách job');
    }
    const orders = await this.jobsService.listAll(null);
    return orders.map(toPublicJson);
  }

  /** Admin tra cứu theo Storage Code (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  @Get('by-storage-code/:storageCode')
  @UseGuards(AdminKeyGuard)
  async getByStorageCode(@Param('storageCode') storageCode: string) {
    const order = await this.jobsService.getByStorageCode(storageCode);
    return toPublicJson(order);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const order = await this.jobsService.getById(id);
    return toPublicJson(order);
  }

  /** Alias — Portal hiện tại đọc status qua GET /jobs/:id (field
   * `status` trong response đầy đủ), route riêng này chỉ để khớp danh
   * sách API đã liệt kê, trả về tập con. */
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const order = await this.jobsService.getById(id);
    return { status: order.status, stageProgress: order.stageProgress };
  }

  /** Route CHÍNH mà Portal thật sự gọi (xem apiConfig.js:
   * CANCEL_JOB -> POST /jobs/:id/cancel). KHÔNG được đổi/xóa route này. */
  @Post(':id/cancel')
  @HttpCode(200)
  async cancelViaPost(@Param('id') id: string) {
    await this.jobsService.cancel(id);
    return { ok: true };
  }

  /** 3-5 ảnh preview có watermark — khách xem trước khi bấm duyệt. */
  @Get(':id/preview')
  async getPreview(@Param('id') id: string) {
    const images = await this.jobsService.getReviewImages(id);
    return { images };
  }

  /** Khách duyệt bản preview -> đóng gói kết quả cuối + mở link tải. */
  @Post(':id/approve')
  @HttpCode(200)
  async approve(@Param('id') id: string) {
    const order = await this.jobsService.approve(id);
    return toPublicJson(order);
  }

  /** Khách yêu cầu chỉnh sửa thay vì duyệt — CHỈ ghi nhận yêu cầu (thông
   * báo + worker_log), KHÔNG đổi status/tiền, xem jobs.service.ts. */
  @Post(':id/request-changes')
  @HttpCode(200)
  async requestChanges(@Param('id') id: string, @Body() body: { note?: string }) {
    await this.jobsService.requestChanges(id, body?.note ?? null);
    return { ok: true };
  }

  /** Ghi log lượt tải (CWS_DATABASE_SCHEMA.md, bảng downloads) rồi
   * redirect sang link B2 thật — Portal KHÔNG được dùng thẳng downloadUrl
   * raw (xem getDownloadUrl() trong RenderService.js), phải qua route
   * này để mọi lượt tải đều được ghi log. */
  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
    const url = await this.jobsService.getDownloadRedirectUrl(id, ip);
    res.redirect(302, url);
  }

  /** Admin xem log Worker (báo lỗi render). */
  @Get(':id/logs')
  async getLogs(@Param('id') id: string) {
    const logs = await this.jobsService.getWorkerLogs(id);
    return { logs };
  }

  /** Thông báo hệ thống liên quan tới job (render xong/lỗi). */
  @Get(':id/notifications')
  async getNotifications(@Param('id') id: string) {
    const notifications = await this.jobsService.getNotifications(id);
    return { notifications };
  }

  /** Alias REST chuẩn (DELETE) — cùng logic với route POST ở trên,
   * thêm để khớp convention REST nếu có client khác gọi kiểu DELETE. */
  @Delete(':id')
  @HttpCode(200)
  async cancelViaDelete(@Param('id') id: string) {
    await this.jobsService.cancel(id);
    return { ok: true };
  }
}
