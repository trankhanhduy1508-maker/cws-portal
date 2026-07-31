import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';

/** Cửa sổ chống replay dùng chung cho MỌI route xác thực theo thiết bị
 * (payment notification + heartbeat) — request có timestamp lệch quá xa
 * (quá khứ hoặc tương lai) so với đồng hồ Backend đều bị từ chối. */
export const DEVICE_REPLAY_WINDOW_MS = 5 * 60 * 1000;

export interface PaymentDeviceAuthRow {
  device_id: string;
  secret: string;
  is_active: boolean;
}

/** Đọc header x-device-id/x-timestamp/x-signature, kiểm tra cửa sổ replay,
 * tra bảng payment_devices — DÙNG CHUNG cho DeviceSignatureGuard (payment
 * notification) và DeviceHeartbeatGuard (heartbeat). Mỗi guard tự tính
 * canonical string + so khớp chữ ký RIÊNG (payload khác nhau), hàm này chỉ
 * lo phần chung: đọc header + chống replay + tra thiết bị. */
export async function readAndValidateDeviceHeaders(
  request: Request,
  supabaseService: SupabaseService,
): Promise<{ deviceId: string; timestampHeader: string; signature: string; device: PaymentDeviceAuthRow }> {
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
    throw new UnauthorizedException('Thiếu header x-device-id/x-timestamp/x-signature');
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    throw new UnauthorizedException('x-timestamp không hợp lệ');
  }
  if (Math.abs(Date.now() - timestamp) > DEVICE_REPLAY_WINDOW_MS) {
    throw new UnauthorizedException(
      'x-timestamp lệch quá xa so với thời gian Backend — request bị từ chối (chống replay)',
    );
  }

  const client = supabaseService.getClient();
  const { data: device, error } = await client
    .from('payment_devices')
    .select('device_id, secret, is_active')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error || !device) {
    throw new UnauthorizedException(`Thiết bị ${deviceId} chưa được đăng ký`);
  }
  if (!device.is_active) {
    throw new ForbiddenException(`Thiết bị ${deviceId} đã bị vô hiệu hoá`);
  }

  return { deviceId, timestampHeader, signature, device: device as PaymentDeviceAuthRow };
}

/** So sánh 2 chuỗi hex cùng chiều dài bằng thời gian không đổi (tránh
 * timing attack đoán dần chữ ký) — độ dài khác nhau coi luôn là sai,
 * KHÔNG dùng timingSafeEqual trực tiếp (nó throw nếu 2 Buffer khác length). */
export function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
