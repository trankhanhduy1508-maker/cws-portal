import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { createHmac } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import { MbbankNotificationDto } from '../../payments/dto/mbbank-notification.dto';
import { readAndValidateDeviceHeaders, safeCompareHex } from './device-auth.util';

/** Rate limit tối thiểu cho MVP — 1 thiết bị vật lý không có lý do gì gửi
 * quá 20 notification/phút (MBBank không đẩy nhanh vậy); chặn sớm nếu
 * thiết bị bị lỗi lặp vô hạn hoặc bị dùng sai mục đích. */
const RATE_LIMIT_MAX_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

declare module 'express' {
  interface Request {
    paymentDevice?: { deviceId: string };
  }
}

/**
 * Thay NotificationSecretGuard (secret tĩnh dùng chung) bằng xác thực
 * THEO TỪNG THIẾT BỊ — PHẦN 5/6 yêu cầu: "notification đến từ thiết bị đã
 * đăng ký" + "request signature hợp lệ" + chống replay + rate limit.
 *
 * Header bắt buộc:
 * - `x-device-id`: id thiết bị (app Android tự sinh UUID lúc cài lần đầu,
 *   Admin đăng ký thủ công vào bảng payment_devices — migration 015).
 * - `x-timestamp`: epoch milliseconds lúc app ký request.
 * - `x-signature`: hex(HMAC-SHA256(device.secret,
 *   `${deviceId}.${timestamp}.${transaction_id}.${amount}.${transfer_content}`)).
 *
 * GIỚI HẠN ĐÃ GHI RÕ (không giả vờ an toàn tuyệt đối): secret nằm trong
 * APK vẫn có thể bị trích xuất (decompile) — đây là bảo mật mức MVP, đủ
 * để chặn request ngẫu nhiên/không biết secret, KHÔNG chống được kẻ tấn
 * công đã có quyền truy cập vật lý/root vào chính điện thoại đăng ký.
 */
@Injectable()
export class DeviceSignatureGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { deviceId, timestampHeader, signature, device } =
      await readAndValidateDeviceHeaders(request, this.supabaseService);

    const dto = request.body as MbbankNotificationDto;
    const canonical = [
      deviceId,
      timestampHeader,
      dto?.transaction_id ?? '',
      dto?.amount ?? '',
      dto?.transfer_content ?? '',
    ].join('.');
    const expectedSignature = createHmac('sha256', device.secret).update(canonical).digest('hex');

    if (!safeCompareHex(signature, expectedSignature)) {
      throw new UnauthorizedException('Chữ ký request không hợp lệ');
    }

    const client = this.supabaseService.getClient();
    const rateLimitSince = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error: countError } = await client
      .from('payment_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('device_id', deviceId)
      .gte('created_at', rateLimitSince);

    if (!countError && (count ?? 0) >= RATE_LIMIT_MAX_PER_MINUTE) {
      throw new HttpException(
        `Thiết bị ${deviceId} vượt giới hạn ${RATE_LIMIT_MAX_PER_MINUTE} request/phút`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    request.paymentDevice = { deviceId };
    return true;
  }
}
