import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { MbbankNotificationDto } from './dto/mbbank-notification.dto';
import { DeviceSignatureGuard } from '../common/guards/device-signature.guard';

/** Route riêng `/payment/notification` (số ít, khác `/payments` của
 * PaymentsController) — đúng path đã thiết kế cho app Android
 * Notification Listener. Tách Controller riêng để không lẫn với các
 * route `/payments/*` khác (khác guard, khác payload shape).
 *
 * Bảo vệ bằng DeviceSignatureGuard (PHẦN 5/6: thiết bị đã đăng ký +
 * chữ ký HMAC + chống replay + rate limit) — thay NotificationSecretGuard
 * (secret tĩnh dùng chung, không phân biệt được thiết bị nào gửi). */
@Controller('payment')
export class PaymentNotificationController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('notification')
  @HttpCode(200)
  @UseGuards(DeviceSignatureGuard)
  async notify(@Body() dto: MbbankNotificationDto, @Req() req: Request) {
    const result = await this.paymentsService.confirmViaMbbankNotification(
      dto,
      req.paymentDevice!.deviceId,
    );
    return { ok: true, ...result };
  }
}
