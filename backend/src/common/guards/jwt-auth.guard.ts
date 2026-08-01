import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * QUYẾT ĐỊNH CÓ CHỦ Ý: Guard này CHƯA được áp dụng cho bất kỳ route
 * công khai nào (jobs/payments/files). Portal ĐÃ có màn hình đăng nhập
 * Google qua Supabase Auth (LoginScreen.jsx) và các route như GET
 * /jobs, POST /jobs đã đọc token NẾU có (xem optional-auth.util.ts,
 * KHÔNG throw nếu thiếu) để lọc theo customer — nhưng KHÔNG bắt buộc,
 * vì chưa cấu hình Google Provider thật trong Supabase Dashboard nên
 * chưa thể ép mọi khách đăng nhập được. Ép đăng nhập bắt buộc ở các
 * route này lúc này sẽ chặn hoàn toàn khách hàng.
 *
 * Guard này được chuẩn bị sẵn (production-ready) để dùng cho các route
 * QUẢN TRỊ nội bộ (vd GET /jobs/by-storage-code/:code, GET /jobs/:id/logs,
 * GET /jobs/:id/notifications — các route Giai đoạn 7 hiện KHÔNG có
 * xác thực) hoặc để BẮT BUỘC đăng nhập trên route công khai một khi có
 * Google Provider thật — chỉ cần thêm @UseGuards(JwtAuthGuard).
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
