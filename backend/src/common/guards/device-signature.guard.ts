import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import { MbbankNotificationDto } from '../../payments/dto/mbbank-notification.dto';

/** Cửa sổ chống replay — request có timestamp lệch quá xa (quá khứ hoặc
 * tương lai) so với đồng hồ Backend đều bị từ chối, dù chữ ký đúng (kể cả
 * chữ ký bị chặn bắt lại và gửi lại y hệt sau đó). */
const REPLAY_WINDOW_MS = 5 * 60 * 1000;
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
    const deviceId = request.headers['x-device-id'];
    const timestampHeader = request.headers['x-timestamp'];
    const signature = request.headers['x-signature'];

    if (
      typeof deviceId !== 'string' ||
      typeof timestampHeader !== 'string' ||
      typeof signature !== 'string' ||
      !deviceId ||
      !timestampHeader ||
      !signature
    ) {
      throw new UnauthorizedException(
        'Thiếu header x-device-id/x-timestamp/x-signature',
      );
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp)) {
      throw new UnauthorizedException('x-timestamp không hợp lệ');
    }
    if (Math.abs(Date.now() - timestamp) > REPLAY_WINDOW_MS) {
      throw new UnauthorizedException(
        'x-timestamp lệch quá xa so với thời gian Backend — request bị từ chối (chống replay)',
      );
    }

    const client = this.supabaseService.getClient();
    const { data: device, error: deviceError } = await client
      .from('payment_devices')
      .select('device_id, secret, is_active')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (deviceError || !device) {
      throw new UnauthorizedException(`Thiết bị ${deviceId} chưa được đăng ký`);
    }
    if (!device.is_active) {
      throw new ForbiddenException(`Thiết bị ${deviceId} đã bị vô hiệu hoá`);
    }

    const dto = request.body as MbbankNotificationDto;
    const canonical = [
      deviceId,
      timestampHeader,
      dto?.transaction_id ?? '',
      dto?.amount ?? '',
      dto?.transfer_content ?? '',
    ].join('.');
    const expectedSignature = createHmac('sha256', device.secret as string)
      .update(canonical)
      .digest('hex');

    if (!safeCompare(signature, expectedSignature)) {
      throw new UnauthorizedException('Chữ ký request không hợp lệ');
    }

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

/** So sánh 2 chuỗi hex cùng chiều dài bằng thời gian không đổi (tránh
 * timing attack đoán dần chữ ký) — độ dài khác nhau coi luôn là sai,
 * KHÔNG dùng timingSafeEqual trực tiếp (nó throw nếu 2 Buffer khác length). */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
