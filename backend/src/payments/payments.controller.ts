import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';
import { AdminKeyGuard } from '../common/guards/admin-key.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.createIntent(dto);
  }

  /** Admin tra cứu theo Payment Code (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  @Get('by-code/:paymentCode')
  @UseGuards(AdminKeyGuard)
  async getByPaymentCode(@Param('paymentCode') paymentCode: string) {
    return this.paymentsService.getByPaymentCode(paymentCode);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const status = await this.paymentsService.getStatus(id);
    return { paymentId: id, status };
  }

  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(@Param('id') id: string) {
    return this.paymentsService.confirm(id);
  }

  /** Ngân hàng (hoặc cổng trung gian) gọi vào đây khi có giao dịch
   * chuyển khoản mới — endpoint DUY NHẤT được phép set payment = PAID. */
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() dto: WebhookPaymentDto) {
    return this.paymentsService.confirmViaWebhook(dto);
  }
}
