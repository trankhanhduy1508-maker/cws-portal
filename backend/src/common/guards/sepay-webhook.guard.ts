import {
  CanActivate,
  ExecutionContext,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Request } from 'express';
import { AppConfig } from '../../config/configuration';
import { safeCompareHex } from './device-auth.util';

/** ±300 giây theo đúng tài liệu chính thức SePay cho chữ ký HMAC-SHA256
 * (developer.sepay.vn/en/sepay-webhooks/xac-thuc) — request có
 * X-SePay-Timestamp lệch quá xa (quá khứ hoặc tương lai) bị từ chối,
 * chống replay 1 request đã bắt được trước đó gửi lại nguyên vẹn. */
const SEPAY_HMAC_REPLAY_WINDOW_MS = 5 * 60 * 1000;

/**
 * Bảo vệ POST /payments/webhook/sepay. Webhook-only cho MVP (quyết định
 * chính thức 2026-08-01 — xem DECISIONS.md +
 * reports/SEPAY_PAYMENT_ARCHITECTURE_RESEARCH.md, KHÔNG triển khai IPN).
 *
 * Ưu tiên **HMAC-SHA256** (khuyến nghị chính thức của SePay, mạnh hơn vì
 * ký cả nội dung request + có timestamp chống replay) nếu
 * `SEPAY_WEBHOOK_HMAC_SECRET` được cấu hình: SePay gửi kèm header
 * `X-SePay-Signature: sha256={hex}` + `X-SePay-Timestamp: {unix_seconds}`,
 * ký bằng `hmac_sha256("{timestamp}.{raw_body}", secret)` — PHẢI dùng
 * đúng byte gốc của request (`req.rawBody`, xem main.ts `rawBody: true`),
 * KHÔNG dùng lại `JSON.stringify(req.body)` vì Nest có thể parse lại
 * khác thứ tự field/khoảng trắng so với byte SePay đã ký.
 *
 * Fallback về API Key tĩnh (`SEPAY_WEBHOOK_API_KEY`, header cố định
 * `Authorization: Apikey <key>`) nếu dashboard SePay của Owner không hỗ
 * trợ/không chọn được HMAC — chỉ cần cấu hình 1 trong 2 biến môi trường,
 * ưu tiên HMAC nếu cả hai cùng có mặt.
 *
 * Nội dung webhook (payment_code/storage_code/amount) tự nó KHÔNG phải
 * bí mật — cùng lý do với WebhookSecretGuard — nên vẫn bắt buộc xác thực
 * riêng, fail-closed giống các guard khác trong dự án: chưa cấu hình gì
 * thì từ chối mọi request thay vì để công khai.
 */
@Injectable()
export class SepayWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const hmacSecret = this.configService.get('sepayWebhookHmacSecret', { infer: true });
    const apiKey = this.configService.get('sepayWebhookApiKey', { infer: true });

    if (!hmacSecret && !apiKey) {
      throw new UnauthorizedException(
        'Webhook SePay chưa được cấu hình (thiếu SEPAY_WEBHOOK_HMAC_SECRET hoặc SEPAY_WEBHOOK_API_KEY) — chặn mặc định thay vì để công khai.',
      );
    }

    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();

    if (hmacSecret) {
      this.verifyHmac(request, hmacSecret);
      return true;
    }

    this.verifyApiKey(request, apiKey!);
    return true;
  }

  private verifyHmac(request: RawBodyRequest<Request>, secret: string): void {
    const signatureHeader = request.headers['x-sepay-signature'];
    const timestampHeader = request.headers['x-sepay-timestamp'];

    if (typeof signatureHeader !== 'string' || typeof timestampHeader !== 'string') {
      throw new UnauthorizedException('Thiếu header X-SePay-Signature/X-SePay-Timestamp từ SePay');
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp)) {
      throw new UnauthorizedException('X-SePay-Timestamp không hợp lệ');
    }
    // SePay gửi timestamp bằng GIÂY (unix seconds), không phải mili-giây.
    if (Math.abs(Date.now() - timestamp * 1000) > SEPAY_HMAC_REPLAY_WINDOW_MS) {
      throw new UnauthorizedException(
        'X-SePay-Timestamp lệch quá xa so với thời gian Backend — từ chối (chống replay)',
      );
    }

    const providedSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice('sha256='.length)
      : signatureHeader;

    const rawBody = request.rawBody ? request.rawBody.toString('utf8') : '';
    const canonical = `${timestampHeader}.${rawBody}`;
    const expectedSignature = createHmac('sha256', secret).update(canonical).digest('hex');

    if (!safeCompareHex(providedSignature, expectedSignature)) {
      throw new UnauthorizedException('Sai chữ ký X-SePay-Signature từ SePay');
    }
  }

  private verifyApiKey(request: Request, apiKey: string): void {
    const authHeader = request.headers.authorization;
    const expected = `Apikey ${apiKey}`;
    if (authHeader !== expected) {
      throw new UnauthorizedException('Thiếu hoặc sai Authorization header từ SePay');
    }
  }
}
