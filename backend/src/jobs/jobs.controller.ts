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
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JobsService } from './jobs.service';
import { CreateJobDto, EstimateJobDto } from './dto/create-job.dto';
import { toPublicJson } from './render-order.presenter';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async create(@Body() dto: CreateJobDto) {
    return this.jobsService.createOrder(dto);
  }

  @Post('estimate')
  @HttpCode(200)
  async estimate(@Body() dto: EstimateJobDto) {
    return this.jobsService.estimate(dto);
  }

  @Get()
  async listAll() {
    const orders = await this.jobsService.listAll();
    return orders.map(toPublicJson);
  }

  /** Admin tra cứu theo Storage Code (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  @Get('by-storage-code/:storageCode')
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

  /** Alias REST chuẩn (DELETE) — cùng logic với route POST ở trên,
   * thêm để khớp convention REST nếu có client khác gọi kiểu DELETE. */
  @Delete(':id')
  @HttpCode(200)
  async cancelViaDelete(@Param('id') id: string) {
    await this.jobsService.cancel(id);
    return { ok: true };
  }
}
