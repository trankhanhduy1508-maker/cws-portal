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
 * Bảo vệ POST /payment/notification (app Android Notification Listener
 * gửi về, xem PaymentsService.confirmViaMbbankNotification()). Điện
 * thoại chỉ được xem là "người đưa tin" (Backend mới quyết định thanh
 * toán thành công) — nếu thiếu guard này, BẤT KỲ ai biết URL đều có thể
 * tự POST notification giả để mở khoá file mà không cần chuyển tiền
 * thật. Secret RIÊNG với PAYMENT_WEBHOOK_SECRET (webhook-secret.guard.ts)
 * vì đây là 1 thiết bị vật lý ngoài tầm kiểm soát trực tiếp — cần rotate/
 * thu hồi độc lập với webhook ngân hàng chính thức nếu điện thoại bị mất/
 * root/cài lại. Fail-closed giống AdminKeyGuard/WebhookSecretGuard.
 */
@Injectable()
export class NotificationSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.configService.get('mbbankNotificationSecret', {
      infer: true,
    });
    if (!secret) {
      throw new UnauthorizedException(
        'Notification MBBank chưa được cấu hình (thiếu MBBANK_NOTIFICATION_SECRET) — chặn mặc định thay vì để công khai.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers['x-notification-secret'];
    if (providedSecret !== secret) {
      throw new UnauthorizedException('Thiếu hoặc sai x-notification-secret');
    }
    return true;
  }
}
