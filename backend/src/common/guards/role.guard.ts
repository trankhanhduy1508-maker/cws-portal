import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';
import { getAuthenticatorAssuranceLevel } from './jwt-claims.util';

export type StaffRole = 'admin' | 'host';

export const ROLES_KEY = 'staffRoles';
/** Route chỉ cho role liệt kê ở đây gọi — mặc định ['admin'] nếu không
 * khai báo (xem RoleGuard bên dưới), giữ tương thích các route trước
 * đây dùng @UseGuards(AdminKeyGuard) không kèm decorator nào khác. */
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);

export interface StaffContext {
  userId: string;
  role: StaffRole;
  /** worker_id thuộc quyền quản lý — CHỈ có ý nghĩa khi role='host', dùng
   * để lọc dữ liệu (Host không được thấy worker của Host khác). */
  workerIds: string[];
}

declare module 'express' {
  interface Request {
    staff?: StaffContext;
  }
}

/**
 * RBAC thật cho toàn bộ Admin/Host API — kiểm tra role ở TẦNG BACKEND,
 * không chỉ ẩn nút trên Frontend (yêu cầu bắt buộc). Tài khoản Admin/Host
 * provision thủ công qua Supabase Auth + 1 dòng staff_roles (migration
 * 013), KHÔNG hardcode email nào trong code.
 *
 * BẮT BUỘC MFA (TOTP) qua chính cơ chế Auth provider đang dùng — Supabase
 * Auth hỗ trợ TOTP MFA có sẵn, miễn phí, bật mặc định trên mọi project
 * (developer.supabase.com/docs/guides/auth/auth-mfa, xác nhận 2026-08-02),
 * KHÔNG tự lưu/quản lý TOTP secret riêng. Access token của 1 session đã
 * hoàn tất thử thách MFA mang claim `aal: "aal2"` — claim này đã được
 * chính `client.auth.getUser(token)` xác thực chữ ký/tính hợp lệ ở trên,
 * nên đọc thêm claim `aal` từ CÙNG token đó (không verify lại) là an
 * toàn (xem jwt-claims.util.ts + tài liệu chính thức "Checking AAL
 * Server-Side" của Supabase).
 *
 * ĐÃ BỎ nhánh `x-admin-key` (2026-08-02, theo yêu cầu Owner "Không tạo
 * bypass" khi thêm MFA) — trước đây key tĩnh này cho qua thẳng role
 * 'admin' mà KHÔNG cần Bearer/MFA gì cả, mâu thuẫn trực tiếp với yêu
 * cầu MFA bắt buộc. Route Admin/Host giờ CHỈ chấp nhận Supabase session
 * thật đã hoàn tất MFA. `x-admin-key`/`AdminKeyGuard` vẫn còn ở nơi
 * khác (vd `GET /jobs` khi ẩn danh) — đó là phạm vi/mục đích KHÁC
 * (không phải Admin Portal), không thuộc yêu cầu MFA lần này.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<StaffRole[]>(
      ROLES_KEY,
      context.getHandler(),
    ) ?? ['admin'];
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu Bearer token — Admin/Host API yêu cầu đăng nhập thật (Supabase Auth) kèm MFA, không còn hỗ trợ x-admin-key.');
    }

    const token = authHeader.slice('Bearer '.length);
    const client = this.supabaseService.getClient();
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user) {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    const { data: roleRow, error: roleError } = await client
      .from('staff_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (roleError || !roleRow) {
      throw new ForbiddenException('Tài khoản chưa được cấp quyền Admin/Host');
    }
    const role = roleRow.role as StaffRole;
    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(
        `Route yêu cầu quyền ${requiredRoles.join('/')}, tài khoản hiện có quyền '${role}'`,
      );
    }

    const aal = getAuthenticatorAssuranceLevel(token);
    if (aal !== 'aal2') {
      throw new ForbiddenException(
        'Tài khoản Admin/Host bắt buộc hoàn tất xác thực MFA (TOTP) trước khi truy cập — hãy hoàn tất bước quét mã Authenticator khi đăng nhập.',
      );
    }

    let workerIds: string[] = [];
    if (role === 'host') {
      const { data: accessRows } = await client
        .from('staff_worker_access')
        .select('worker_id')
        .eq('user_id', userData.user.id);
      workerIds = (accessRows ?? []).map((r: { worker_id: string }) => r.worker_id);
    }

    request.staff = { userId: userData.user.id, role, workerIds };
    return true;
  }
}
