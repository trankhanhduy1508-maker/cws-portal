import { CanActivate, ExecutionContext, Injectable, RawBodyRequest, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AppConfig } from '../../config/configuration';
import { verifySepayApiKey, verifySepayHmacSignature } from './sepay-webhook.guard';

/**
 * Bảo vệ POST /payments/webhook/sepay/test — route RIÊNG cho SePay Test
 * Mode/Sandbox (my.dev.sepay.vn, tài khoản TÁCH BIỆT hoàn toàn khỏi Live
 * my.sepay.vn theo tài liệu chính thức SePay — xem
 * CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md mục 3).
 *
 * Đọc CẶP BIẾN MÔI TRƯỜNG KHÁC hoàn toàn với `SepayWebhookGuard`
 * (`SEPAY_WEBHOOK_HMAC_SECRET_TEST` / `SEPAY_WEBHOOK_API_KEY_TEST`, không
 * phải `SEPAY_WEBHOOK_HMAC_SECRET`/`SEPAY_WEBHOOK_API_KEY` của Live) — đây
 * là cơ chế tách Sandbox/Live: 2 route khác nhau + 2 secret khác nhau, để
 * 1 request Test Mode (giao dịch giả lập, không có tiền thật) KHÔNG BAO GIỜ
 * có thể xác thực được vào route Live và ngược lại, kể cả khi Owner vô
 * tình trỏ nhầm URL trên dashboard SePay. Logic đối chiếu/set PAID
 * (`PaymentsService.confirmViaSepayWebhook`) được TÁI SỬ DỤNG y nguyên,
 * không tạo bảng/luồng dữ liệu song song — an toàn vì payment_code sinh
 * ngẫu nhiên (xem PaymentsService.createIntent), 1 giao dịch giả lập gần
 * như không thể trùng payment_code của khách hàng thật.
 */
@Injectable()
export class SepayWebhookTestGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const hmacSecret = this.configService.get('sepayWebhookHmacSecretTest', { infer: true });
    const apiKey = this.configService.get('sepayWebhookApiKeyTest', { infer: true });

    if (!hmacSecret && !apiKey) {
      throw new UnauthorizedException(
        'Webhook SePay Test Mode chưa được cấu hình (thiếu SEPAY_WEBHOOK_HMAC_SECRET_TEST hoặc SEPAY_WEBHOOK_API_KEY_TEST) — chặn mặc định thay vì để công khai.',
      );
    }

    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();

    if (hmacSecret) {
      verifySepayHmacSignature(request, hmacSecret);
      return true;
    }

    verifySepayApiKey(request, apiKey!);
    return true;
  }
}
