import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { SupabaseService } from '../../supabase/supabase.service';
import { RoleGuard, ROLES_KEY, StaffContext } from './role.guard';

function makeContext(headers: Record<string, string>): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; query: Record<string, string>; staff?: StaffContext };
} {
  const request: { headers: Record<string, string>; query: Record<string, string>; staff?: StaffContext } = {
    headers,
    query: {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeReflector(roles: string[] | undefined): Reflector {
  return { get: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
}

function makeConfigService(adminApiKey: string | null): ConfigService<AppConfig, true> {
  return { get: jest.fn().mockReturnValue(adminApiKey) } as unknown as ConfigService<AppConfig, true>;
}

describe('RoleGuard', () => {
  it('cho qua với role admin khi x-admin-key hợp lệ (lớp phòng thủ phụ, tương thích AdminScreen.jsx)', async () => {
    const guard = new RoleGuard(
      makeReflector(undefined),
      {} as SupabaseService,
      makeConfigService('secret-key'),
    );
    const { context, request } = makeContext({ 'x-admin-key': 'secret-key' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.staff?.role).toBe('admin');
  });

  it('TỪ CHỐI route yêu cầu role host dù x-admin-key hợp lệ (admin-key không thay thế được quyền host)', async () => {
    const guard = new RoleGuard(
      makeReflector(['host']),
      { getClient: jest.fn() } as unknown as SupabaseService,
      makeConfigService('secret-key'),
    );
    const { context } = makeContext({ 'x-admin-key': 'secret-key' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('từ chối khi thiếu cả Bearer token lẫn x-admin-key', async () => {
    const guard = new RoleGuard(
      makeReflector(undefined),
      {} as SupabaseService,
      makeConfigService('secret-key'),
    );
    const { context } = makeContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('từ chối khi Bearer token không hợp lệ', async () => {
    const mockSupabase = {
      getClient: () => ({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } }) },
      }),
    } as unknown as SupabaseService;
    const guard = new RoleGuard(makeReflector(undefined), mockSupabase, makeConfigService(null));
    const { context } = makeContext({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('từ chối khi user hợp lệ nhưng chưa có staff_roles (chưa được cấp quyền)', async () => {
    const mockSupabase = {
      getClient: () => ({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
        }),
      }),
    } as unknown as SupabaseService;
    const guard = new RoleGuard(makeReflector(undefined), mockSupabase, makeConfigService(null));
    const { context } = makeContext({ authorization: 'Bearer good-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('TỪ CHỐI khi role không khớp yêu cầu (host cố gọi route admin)', async () => {
    const mockSupabase = {
      getClient: () => ({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'host-1' } }, error: null }) },
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'host' }, error: null }) }),
          }),
        }),
      }),
    } as unknown as SupabaseService;
    const guard = new RoleGuard(makeReflector(['admin']), mockSupabase, makeConfigService(null));
    const { context } = makeContext({ authorization: 'Bearer host-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('cho qua role host và gắn ĐÚNG danh sách worker_id của host đó vào request.staff (Host không được thấy worker của Host khác)', async () => {
    const mockSupabase = {
      getClient: () => ({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'host-1' } }, error: null }) },
        from: (table: string) => {
          if (table === 'staff_roles') {
            return {
              select: () => ({
                eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'host' }, error: null }) }),
              }),
            };
          }
          return {
            select: () => ({
              eq: jest.fn().mockResolvedValue({ data: [{ worker_id: 'W1' }, { worker_id: 'W2' }] }),
            }),
          };
        },
      }),
    } as unknown as SupabaseService;
    const guard = new RoleGuard(makeReflector(['host']), mockSupabase, makeConfigService(null));
    const { context, request } = makeContext({ authorization: 'Bearer host-token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.staff).toEqual({ userId: 'host-1', role: 'host', workerIds: ['W1', 'W2'] });
  });

  it('mặc định yêu cầu role admin khi route không khai báo @Roles() nào', async () => {
    const mockSupabase = {
      getClient: () => ({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'host-1' } }, error: null }) },
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'host' }, error: null }) }),
          }),
        }),
      }),
    } as unknown as SupabaseService;
    const guard = new RoleGuard(makeReflector(undefined), mockSupabase, makeConfigService(null));
    const { context } = makeContext({ authorization: 'Bearer host-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

describe('ROLES_KEY', () => {
  it('là 1 hằng số metadata key ổn định (Reflector dùng để đọc @Roles())', () => {
    expect(ROLES_KEY).toBe('staffRoles');
  });
});
