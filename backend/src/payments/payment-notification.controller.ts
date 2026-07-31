import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { PaymentDevicesRepository } from './payment-devices.repository';
import { MbbankNotificationDto } from './dto/mbbank-notification.dto';
import { DeviceHeartbeatDto } from './dto/device-heartbeat.dto';
import { DeviceSignatureGuard } from '../common/guards/device-signature.guard';
import { DeviceHeartbeatGuard } from '../common/guards/device-heartbeat.guard';

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
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentDevicesRepository: PaymentDevicesRepository,
  ) {}

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

  /** PHẦN 2.5 — heartbeat định kỳ từ app Android, KHÔNG có ý nghĩa tài
   * chính (khác /payment/notification). Bảo vệ bằng DeviceHeartbeatGuard
   * (cùng thiết bị đã đăng ký + chữ ký, canonical nhẹ hơn). */
  @Post('device/heartbeat')
  @HttpCode(200)
  @UseGuards(DeviceHeartbeatGuard)
  async heartbeat(@Body() dto: DeviceHeartbeatDto, @Req() req: Request) {
    await this.paymentDevicesRepository.updateHeartbeat(req.paymentDevice!.deviceId, dto);
    return { ok: true };
  }
}
