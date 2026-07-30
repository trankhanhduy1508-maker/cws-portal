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
 * Bảo vệ POST /payments/webhook. Nội dung webhook (payment_code,
 * storage_code, amount) tự nó KHÔNG phải bí mật — đây là đúng những giá
 * trị Portal hiển thị cho khách để họ chuyển khoản (transferContent,
 * QR), nên bất kỳ khách hàng nào cũng biết đủ 3 giá trị đó cho chính
 * payment của mình mà không cần thực sự chuyển tiền. Nếu thiếu guard
 * này, khách có thể tự POST thẳng vào webhook để đánh dấu PAID cho job
 * của mình — vô hiệu hoá hoàn toàn bước thanh toán.
 *
 * Header `x-webhook-secret` phải khớp `PAYMENT_WEBHOOK_SECRET` (cấu hình
 * ở phía ngân hàng/cổng trung gian khi khai báo URL webhook). Fail-closed
 * giống AdminKeyGuard: chưa cấu hình secret thì từ chối mọi request thay
 * vì để webhook công khai.
 */
@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.configService.get('paymentWebhookSecret', {
      infer: true,
    });
    if (!secret) {
      throw new UnauthorizedException(
        'Webhook thanh toán chưa được cấu hình (thiếu PAYMENT_WEBHOOK_SECRET) — chặn mặc định thay vì để công khai.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers['x-webhook-secret'];
    if (providedSecret !== secret) {
      throw new UnauthorizedException('Thiếu hoặc sai x-webhook-secret');
    }
    return true;
  }
}
