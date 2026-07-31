import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { createHmac } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import { readAndValidateDeviceHeaders, safeCompareHex } from './device-auth.util';

declare module 'express' {
  interface Request {
    paymentDevice?: { deviceId: string };
  }
}

/**
 * Bảo vệ POST /payment/device/heartbeat (PHẦN 2.5) — cùng cơ chế thiết bị
 * đã đăng ký + chữ ký HMAC + chống replay như DeviceSignatureGuard, nhưng
 * canonical string KHÔNG gồm dữ liệu tài chính (heartbeat không có ý nghĩa
 * tiền bạc) — chỉ `${deviceId}.${timestamp}`, và KHÔNG rate-limit chặt như
 * payment notification (heartbeat định kỳ tần suất thấp, rủi ro thấp hơn).
 */
@Injectable()
export class DeviceHeartbeatGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { deviceId, timestampHeader, signature, device } =
      await readAndValidateDeviceHeaders(request, this.supabaseService);

    const canonical = `${deviceId}.${timestampHeader}`;
    const expectedSignature = createHmac('sha256', device.secret).update(canonical).digest('hex');

    if (!safeCompareHex(signature, expectedSignature)) {
      throw new UnauthorizedException('Chữ ký request không hợp lệ');
    }

    request.paymentDevice = { deviceId };
    return true;
  }
}
