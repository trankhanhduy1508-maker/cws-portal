import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';
import { AppConfig } from '../../config/configuration';
import { isValidAdminKey } from './admin-key.guard';

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
 * RBAC thật (thay AdminKeyGuard ở các route Admin/Host) — kiểm tra role
 * ở TẦNG BACKEND, không chỉ ẩn nút trên Frontend (yêu cầu bắt buộc).
 * Tài khoản Admin/Host provision thủ công qua Supabase Auth + 1 dòng
 * staff_roles (migration 013), KHÔNG hardcode email nào trong code.
 *
 * Giữ x-admin-key làm lớp phòng thủ phụ TÙY CHỌN (tương thích ngược
 * AdminScreen.jsx/luồng vận hành hiện tại đang dùng key) — hợp lệ luôn
 * được coi là role 'admin', nhưng route chỉ chấp nhận nếu 'admin' nằm
 * trong danh sách role yêu cầu của chính route đó.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<StaffRole[]>(
      ROLES_KEY,
      context.getHandler(),
    ) ?? ['admin'];
    const request = context.switchToHttp().getRequest<Request>();

    const adminApiKey = this.configService.get('adminApiKey', { infer: true });
    if (requiredRoles.includes('admin') && isValidAdminKey(request, adminApiKey)) {
      request.staff = { userId: 'x-admin-key', role: 'admin', workerIds: [] };
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu Bearer token hoặc x-admin-key');
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
