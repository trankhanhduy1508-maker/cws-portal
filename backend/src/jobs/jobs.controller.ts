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
import { RoleGuard } from '../common/guards/role.guard';
import { isAuthenticatedMfaAdmin } from '../common/guards/staff-auth.util';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly supabaseService: SupabaseService,
  ) {}
  /** Chỉ Bearer token Admin thật đã hoàn tất MFA hợp lệ mới bỏ qua kiểm tra
   * chủ sở hữu job. Shared x-admin-key legacy không còn được chấp nhận. */
  private async isAdminRequest(req: Request): Promise<boolean> {
    return isAuthenticatedMfaAdmin(req, this.supabaseService);
  }

  @Post()
  async create(@Body() dto: CreateJobDto, @Req() req: Request) {
    // Gắn customerId NẾU khách đã đăng nhập Google qua Supabase Auth
    // (Bearer token hợp lệ) — KHÔNG bắt buộc, job vẫn tạo được cho khách
    // chưa đăng nhập (xem lý do ở jwt-auth.guard.ts).
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    const idempotencyKey = req.header('Idempotency-Key');
    return this.jobsService.createOrder(dto, customerId, idempotencyKey);
  }

  @Post('estimate')
  @HttpCode(200)
  async estimate(@Body() dto: EstimateJobDto) {
    return this.jobsService.estimate(dto);
  }

  /** Khách đã đăng nhập chỉ thấy job của mình; Admin/Host dùng Bearer + AAL2.
   * Anonymous không được liệt kê toàn bộ job. */
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

  /** Admin tra cứu theo Storage Code (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  @Get('by-storage-code/:storageCode')
  @UseGuards(RoleGuard)
  async getByStorageCode(@Param('storageCode') storageCode: string) {
    const order = await this.jobsService.getByStorageCode(storageCode);
    return toPublicJson(order);
  }

  /** Job có customer_id -> chỉ đúng chủ (hoặc khách chưa đăng nhập) mới
   * xem/thao tác được — xem JobsService.assertOwnership(). Job không có
   * chủ (tạo lúc chưa đăng nhập) vẫn mở cho ai biết id, giữ nguyên hành
   * vi cũ cho khách vãng lai. */
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

  /** Alias — Portal hiện tại đọc status qua GET /jobs/:id (field
   * `status` trong response đầy đủ), route riêng này chỉ để khớp danh
   * sách API đã liệt kê, trả về tập con. */
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

  /** Route CHÍNH mà Portal thật sự gọi (xem apiConfig.js:
   * CANCEL_JOB -> POST /jobs/:id/cancel). KHÔNG được đổi/xóa route này. */
  @Post(':id/cancel')
  @HttpCode(200)
  async cancelViaPost(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    await this.jobsService.cancel(
      id,
      customerId,
      await this.isAdminRequest(req),
    );
    return { ok: true };
  }

  /** 3-5 ảnh preview có watermark — khách xem trước khi bấm duyệt; Admin
   * Dashboard đọc qua Bearer + AAL2. */
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

  /** Khách duyệt bản preview -> sinh QR MB Bank, chờ webhook xác nhận
   * PAID rồi mới đóng gói + mở link tải (xem JobsService.finalizeDelivery()). */
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

  /** Khách yêu cầu chỉnh sửa thay vì duyệt — CHỈ ghi nhận yêu cầu (thông
   * báo + worker_log), KHÔNG đổi status/tiền, xem jobs.service.ts. */
  @Post(':id/request-changes')
  @HttpCode(200)
  async requestChanges(
    @Param('id') id: string,
    @Body() body: { note?: string },
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

  /** Ghi log lượt tải (CWS_DATABASE_SCHEMA.md, bảng downloads) rồi
   * redirect sang link B2 thật — Portal KHÔNG được dùng thẳng downloadUrl
   * raw (xem getDownloadUrl() trong RenderService.js), phải qua route
   * này để mọi lượt tải đều được ghi log. */
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

  /** Admin xem log Worker (báo lỗi render) qua Bearer + AAL2. */
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

  /** Thông báo hệ thống liên quan tới job (render xong/lỗi). */
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

  /** Alias REST chuẩn (DELETE) — cùng logic với route POST ở trên,
   * thêm để khớp convention REST nếu có client khác gọi kiểu DELETE. */
  @Delete(':id')
  @HttpCode(200)
  async cancelViaDelete(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    await this.jobsService.cancel(
      id,
      customerId,
      await this.isAdminRequest(req),
    );
    return { ok: true };
  }
}
