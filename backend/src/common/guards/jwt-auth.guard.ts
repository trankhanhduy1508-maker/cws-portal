import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Portal có màn hình đăng nhập Google qua Supabase Auth (LoginScreen.jsx).
 * Customer submit/render đã được frontend gate bằng Google OAuth và
 * POST /jobs áp dụng guard này; các route estimate vẫn public để khách
 * xem giá trước khi submit.
 *
 * Guard này được chuẩn bị sẵn (production-ready) để dùng cho các route
 * QUẢN TRỊ nội bộ (vd GET /jobs/by-storage-code/:code, GET /jobs/:id/logs,
 * GET /jobs/:id/notifications — các route Giai đoạn 7 hiện KHÔNG có
 * xác thực) hoặc để BẮT BUỘC đăng nhập trên route công khai một khi có
 * Google Provider thật — route nào cần identity chỉ cần thêm guard này.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu Bearer token');
    }

    const token = authHeader.slice('Bearer '.length);
    const { data, error } = await this.supabaseService.getClient().auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    return true;
  }
}
