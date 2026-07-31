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
import { RoleGuard } from '../common/guards/role.guard';
import { WebhookSecretGuard } from '../common/guards/webhook-secret.guard';

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
}
