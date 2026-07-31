import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MbbankNotificationDto } from './dto/mbbank-notification.dto';
import { NotificationSecretGuard } from '../common/guards/notification-secret.guard';

/** Route riêng `/payment/notification` (số ít, khác `/payments` của
 * PaymentsController) — đúng path đã thiết kế cho app Android
 * Notification Listener. Tách Controller riêng để không lẫn với các
 * route `/payments/*` khác (khác guard, khác payload shape). */
@Controller('payment')
export class PaymentNotificationController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('notification')
  @HttpCode(200)
  @UseGuards(NotificationSecretGuard)
  async notify(@Body() dto: MbbankNotificationDto) {
    const result = await this.paymentsService.confirmViaMbbankNotification(dto);
    return { ok: true, ...result };
  }
}
