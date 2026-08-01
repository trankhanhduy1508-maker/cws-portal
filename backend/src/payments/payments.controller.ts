import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentDevicesRepository } from './payment-devices.repository';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { RoleGuard } from '../common/guards/role.guard';
import { WebhookSecretGuard } from '../common/guards/webhook-secret.guard';
import { SepayWebhookGuard } from '../common/guards/sepay-webhook.guard';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentDevicesRepository: PaymentDevicesRepository,
  ) {}

  /** Admin Dashboard (Phần 2.5) — danh sách thiết bị Android gửi payment
   * notification, CHỈ đọc. Khai báo TRƯỚC `:id` bên dưới để tránh bị route
   * `:id` (khớp mọi chuỗi) nuốt mất request `/payments/devices`. */
  @Get('devices')
  @UseGuards(RoleGuard)
  async listDevices() {
    return this.paymentDevicesRepository.listAll();
  }

  @Post()
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.createIntent(dto);
  }

  /** Admin tra cứu theo Payment Code (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  @Get('by-code/:paymentCode')
  @UseGuards(RoleGuard)
  async getByPaymentCode(@Param('paymentCode') paymentCode: string) {
    return this.paymentsService.getByPaymentCode(paymentCode);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.paymentsService.getPublicDetails(id);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(@Param('id') id: string) {
    return this.paymentsService.confirm(id);
  }

  /** Ngân hàng (hoặc cổng trung gian) gọi vào đây khi có giao dịch
   * chuyển khoản mới — endpoint DUY NHẤT được phép set payment = PAID.
   * Bảo vệ bằng WebhookSecretGuard (header x-webhook-secret) vì nội
   * dung webhook không tự nó là bí mật — xem comment trong guard. */
  @Post('webhook')
  @HttpCode(200)
  @UseGuards(WebhookSecretGuard)
  async webhook(@Body() dto: WebhookPaymentDto) {
    return this.paymentsService.confirmViaWebhook(dto);
  }

  /** SePay gọi vào đây khi có biến động số dư MB Bank thật (nghiên cứu
   * 2026-08-01, xem backend/BACKEND_SETUP.md mục 3c) — route RIÊNG với
   * /webhook ở trên vì payload SePay có shape khác hẳn (field name khác,
   * cần lọc transferType), không ép chung 1 DTO cho 2 nguồn khác nhau.
   * Bảo vệ bằng SepayWebhookGuard (header Authorization: Apikey <key>,
   * tên header cố định do SePay quy định). */
  @Post('webhook/sepay')
  @HttpCode(200)
  @UseGuards(SepayWebhookGuard)
  async sepayWebhook(@Body() dto: SepayWebhookDto) {
    return this.paymentsService.confirmViaSepayWebhook(dto);
  }
}
