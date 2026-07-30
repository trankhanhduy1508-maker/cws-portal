import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AppConfig } from '../../config/configuration';

/** Dùng ở nơi cần kiểm tra CÓ ĐIỀU KIỆN (vd GET /jobs: chỉ đòi admin key
 * khi KHÔNG có customer token) — AdminKeyGuard bên dưới dùng cho route
 * LUÔN LUÔN cần admin key. */
export function isValidAdminKey(req: Request, adminApiKey: string | null): boolean {
  if (!adminApiKey) return false;
  return req.headers['x-admin-key'] === adminApiKey;
}

/**
 * Bảo vệ các route Admin/Giai đoạn 7 (tra cứu theo storage_code/payment_code,
 * xem log Worker, xem toàn bộ danh sách job) bằng 1 SHARED SECRET đơn
 * giản (header `x-admin-key`) — KHÔNG phải hệ thống phân quyền
 * enterprise (không role, không RBAC), đúng tinh thần "Admin/service
 * role dùng cho tác vụ backend cần thiết". Trước migration này các
 * route trên hoàn toàn công khai, ai cũng gọi được.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const adminApiKey = this.configService.get('adminApiKey', { infer: true });
    if (!adminApiKey) {
      throw new UnauthorizedException(
        'Route Admin chưa được cấu hình (thiếu ADMIN_API_KEY) — chặn mặc định thay vì để công khai.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedKey = request.headers['x-admin-key'];
    if (providedKey !== adminApiKey) {
      throw new UnauthorizedException('Thiếu hoặc sai x-admin-key');
    }
    return true;
  }
}
