import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';
import { StaffRole } from './role.guard';
import type { StaffContext } from './role.guard';

/**
 * Authenticates a staff identity before MFA only for the non-sensitive
 * onboarding/status endpoint. It must never protect an Admin data route;
 * those routes continue to use RoleGuard, which requires aal2.
 */
@Injectable()
export class StaffIdentityGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu Bearer token');
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
    if (role !== 'admin' && role !== 'host') {
      throw new ForbiddenException('Vai trò nhân sự không hợp lệ');
    }
    request.staff = { userId: userData.user.id, role, workerIds: [] } satisfies StaffContext;
    return true;
  }
}
