import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AppConfig } from '../../config/configuration';

/**
 * Bảo vệ POST /payments/webhook/sepay. SePay xác thực webhook bằng header
 * `Authorization: Apikey <key>` — tên header CỐ ĐỊNH do SePay quy định
 * (Security > API Key trong lúc tạo Webhook trên SePay Dashboard), không
 * tùy chỉnh được, nên KHÔNG dùng lại WebhookSecretGuard (đọc header
 * `x-webhook-secret` — thiết kế cho gateway tùy chỉnh được header, không
 * khớp SePay).
 *
 * Nội dung webhook (payment_code/storage_code/amount) tự nó KHÔNG phải bí
 * mật — cùng lý do với WebhookSecretGuard — nên vẫn bắt buộc xác thực
 * riêng, fail-closed giống các guard khác trong dự án: chưa cấu hình
 * SEPAY_WEBHOOK_API_KEY thì từ chối mọi request thay vì để công khai.
 */
@Injectable()
export class SepayWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKey = this.configService.get('sepayWebhookApiKey', { infer: true });
    if (!apiKey) {
      throw new UnauthorizedException(
        'Webhook SePay chưa được cấu hình (thiếu SEPAY_WEBHOOK_API_KEY) — chặn mặc định thay vì để công khai.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const expected = `Apikey ${apiKey}`;
    if (authHeader !== expected) {
      throw new UnauthorizedException('Thiếu hoặc sai Authorization header từ SePay');
    }
    return true;
  }
}
