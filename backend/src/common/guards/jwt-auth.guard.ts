import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Request } from 'express';
import { AppConfig } from '../../config/configuration';

/**
 * QUYẾT ĐỊNH CÓ CHỦ Ý: Guard này CHƯA được áp dụng cho bất kỳ route
 * công khai nào (jobs/payments/files) — Customer Portal hiện tại KHÔNG
 * có màn hình đăng nhập (xem toàn bộ Portal, không có trang Login),
 * nên bắt buộc JWT cho các route đó sẽ chặn luôn luồng khách hàng bình
 * thường, không khớp với UX đã xây. Đây KHÔNG phải thiếu sót — đây là
 * lựa chọn có cân nhắc để tránh over-engineering (xây hệ xác thực đầy
 * đủ cho 1 sản phẩm chưa có khái niệm tài khoản khách hàng).
 *
 * Guard này được chuẩn bị sẵn (production-ready) để dùng cho các route
 * QUẢN TRỊ nội bộ trong tương lai (vd /admin/jobs, /admin/wake-config)
 * — chỉ cần thêm @UseGuards(JwtAuthGuard) vào Controller đó.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu Bearer token');
    }

    const token = authHeader.slice('Bearer '.length);
    const secret = this.configService.get('jwtSecret', { infer: true });

    try {
      jwt.verify(token, secret);
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
