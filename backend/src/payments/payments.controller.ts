import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentDevicesRepository } from './payment-devices.repository';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { RoleGuard } from '../common/guards/role.guard';
import { WebhookSecretGuard } from '../common/guards/webhook-secret.guard';
import { SepayWebhookGuard } from '../common/guards/sepay-webhook.guard';
import { SepayWebhookTestGuard } from '../common/guards/sepay-webhook-test.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { getOptionalCustomerId } from '../common/optional-auth.util';
import type { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentDevicesRepository: PaymentDevicesRepository,
    private readonly supabaseService: SupabaseService,
  ) {}

  /** Admin Dashboard (Phần 2.5) — danh sách thiết bị Android gửi payment
   * notification, CHỈ đọc. Khai báo TRƯỚC `:id` bên dưới để tránh bị route
   * `:id` (khớp mọi chuỗi) nuốt mất request `/payments/devices`. */
  @Get('devices')
  @UseGuards(RoleGuard)
  async listDevices() {
    return this.paymentDevicesRepository.listAll();
  }

  /** Payment/refund safety net (2026-08-03, DECISIONS.md "Payment
   * reconciliation") — wire view CHỈ ĐỌC `payment_reconciliation_anomalies`
   * (worker_migrations/015_...) vào Admin Dashboard thay vì Admin phải tự
   * query qua Supabase SQL Editor. Khai báo TRƯỚC `:id` cùng lý do với
   * `devices` ở trên. */
  @Get('reconciliation-anomalies')
  @UseGuards(RoleGuard)
  async listReconciliationAnomalies() {
    return this.paymentsService.listReconciliationAnomalies();
  }

  /** Admin tra cứu theo Payment Code (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  @Get('by-code/:paymentCode')
  @UseGuards(RoleGuard)
  async getByPaymentCode(@Param('paymentCode') paymentCode: string) {
    return this.paymentsService.getByPaymentCode(paymentCode);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    return this.paymentsService.getPublicDetailsForCustomer(id, customerId);
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
   * Bảo vệ bằng SepayWebhookGuard — ưu tiên HMAC-SHA256
   * (X-SePay-Signature/X-SePay-Timestamp), fallback API Key tĩnh
   * (Authorization: Apikey <key>) nếu HMAC không cấu hình. Response BẮT
   * BUỘC { success: true } theo đúng tài liệu chính thức SePay (nghiên
   * cứu 2026-08-02, developer.sepay.vn/en/sepay-webhooks/tich-hop-webhook
   * — "Your endpoint must return: HTTP 200/201 + {"success": true} JSON
   * body... for SePay to mark delivery as successful") — thiếu field này
   * có thể khiến SePay coi delivery thất bại và tự động retry vô ích. */
  @Post('webhook/sepay')
  @HttpCode(200)
  @UseGuards(SepayWebhookGuard)
  async sepayWebhook(@Body() dto: SepayWebhookDto) {
    const result = await this.paymentsService.confirmViaSepayWebhook(dto);
    return { success: true, ...result };
  }

  /** SePay Test Mode/Sandbox (my.dev.sepay.vn — tài khoản TÁCH BIỆT hoàn
   * toàn khỏi Live, nghiên cứu 2026-08-02,
   * CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md mục 3/6). Payload/logic
   * đối chiếu giống hệt route Live (tài liệu SePay xác nhận HMAC-SHA256
   * không khác biệt giữa Test/Live) — CHỈ khác secret xác thực
   * (SepayWebhookTestGuard đọc SEPAY_WEBHOOK_HMAC_SECRET_TEST/
   * SEPAY_WEBHOOK_API_KEY_TEST, KHÔNG PHẢI biến của Live) và đường dẫn
   * route, để 1 giao dịch giả lập Test Mode không bao giờ xác thực được
   * vào route Live. */
  @Post('webhook/sepay/test')
  @HttpCode(200)
  @UseGuards(SepayWebhookTestGuard)
  async sepayWebhookTest(@Body() dto: SepayWebhookDto) {
    const result = await this.paymentsService.confirmViaSepayWebhook(dto);
    return { success: true, ...result };
  }
}
