import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { RoleGuard, ROLES_KEY, StaffContext } from './role.guard';

function makeContext(headers: Record<string, string>): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; staff?: StaffContext };
} {
  const request: { headers: Record<string, string>; staff?: StaffContext } = { headers };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
  return { context, request };
}

function makeReflector(roles: string[] | undefined): Reflector {
  return { get: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
}

/** Sinh 1 Bearer token GIẢ chỉ để test decode claim `aal` — guard KHÔNG
 * tự verify chữ ký (đã dựa vào `client.auth.getUser()` mock ở dưới để
 * "xác thực"), nên chữ ký ở đây để rỗng cũng không sao, chỉ cần đúng
 * cấu trúc 3 phần header.payload.signature. */
function fakeSupabaseToken(aal: 'aal1' | 'aal2' | undefined): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(aal ? { aal } : {})).toString('base64url');
  return `${header}.${payload}.fake-signature`;
}

function makeSupabaseWithRole(role: 'admin' | 'host' | null, userId = 'user-1'): SupabaseService {
  return {
    getClient: () => ({
      auth: {
        getUser: jest.fn().mockResolvedValue(
          role === null
            ? { data: { user: null }, error: { message: 'invalid' } }
            : { data: { user: { id: userId } }, error: null },
        ),
      },
      from: (table: string) => {
        if (table === 'staff_roles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: jest
                  .fn()
                  .mockResolvedValue(role ? { data: { role }, error: null } : { data: null, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }),
        };
      },
    }),
  } as unknown as SupabaseService;
}

describe('RoleGuard — TEST SECURITY ADMIN (2026-08-02, bắt buộc MFA qua Supabase Auth)', () => {
  it('1. anonymous (không Bearer) → DENIED', async () => {
    const guard = new RoleGuard(makeReflector(undefined), {} as SupabaseService);
    const { context } = makeContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('KHÔNG còn hỗ trợ x-admin-key làm bypass (đã bỏ theo yêu cầu "Không tạo bypass")', async () => {
    const guard = new RoleGuard(makeReflector(undefined), {} as SupabaseService);
    const { context } = makeContext({ 'x-admin-key': 'bat-ky-gia-tri-nao' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('2. customer authenticated (Bearer hợp lệ, KHÔNG có staff_roles) → DENIED', async () => {
    // getUser() thành công (khách THẬT SỰ đã đăng nhập) nhưng bảng
    // staff_roles không có dòng nào cho user này — khác hẳn "token sai".
    const mockSupabase = {
      getClient: () => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          }),
        }),
      }),
    } as unknown as SupabaseService;
    const guard = new RoleGuard(makeReflector(undefined), mockSupabase);
    const { context } = makeContext({ authorization: `Bearer ${fakeSupabaseToken('aal2')}` });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('3. admin CHƯA hoàn tất MFA (aal1) → DENIED', async () => {
    const mockSupabase = makeSupabaseWithRole('admin');
    const guard = new RoleGuard(makeReflector(undefined), mockSupabase);
    const { context } = makeContext({ authorization: `Bearer ${fakeSupabaseToken('aal1')}` });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('3b. admin token KHÔNG có claim aal (mặc định coi là aal1) → DENIED', async () => {
    const mockSupabase = makeSupabaseWithRole('admin');
    const guard = new RoleGuard(makeReflector(undefined), mockSupabase);
    const { context } = makeContext({ authorization: `Bearer ${fakeSupabaseToken(undefined)}` });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('4. admin + MFA hợp lệ (aal2) → PASS', async () => {
    const mockSupabase = makeSupabaseWithRole('admin', 'admin-1');
    const guard = new RoleGuard(makeReflector(undefined), mockSupabase);
    const { context, request } = makeContext({ authorization: `Bearer ${fakeSupabaseToken('aal2')}` });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.staff).toEqual({ userId: 'admin-1', role: 'admin', workerIds: [] });
  });

  it('5. gọi trực tiếp route Admin API với Bearer hợp lệ nhưng thiếu MFA assurance → DENIED (không có đường tắt nào khác)', async () => {
    const mockSupabase = makeSupabaseWithRole('admin');
    const guard = new RoleGuard(makeReflector(['admin']), mockSupabase);
    const { context } = makeContext({ authorization: `Bearer ${fakeSupabaseToken('aal1')}` });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('6. cross-role/privilege escalation: role host cố gọi route yêu cầu admin (dù đã MFA) → DENIED', async () => {
    const mockSupabase = makeSupabaseWithRole('host');
    const guard = new RoleGuard(makeReflector(['admin']), mockSupabase);
    const { context } = makeContext({ authorization: `Bearer ${fakeSupabaseToken('aal2')}` });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('từ chối khi Bearer token không hợp lệ (Supabase getUser lỗi)', async () => {
    const mockSupabase = makeSupabaseWithRole(null);
    const guard = new RoleGuard(makeReflector(undefined), mockSupabase);
    const { context } = makeContext({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('host + MFA hợp lệ → PASS, gắn ĐÚNG danh sách worker_id của host đó (Host không thấy worker của Host khác)', async () => {
    const mockSupabase = {
      getClient: () => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'host-1' } }, error: null }),
        },
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
    const guard = new RoleGuard(makeReflector(['host']), mockSupabase);
    const { context, request } = makeContext({ authorization: `Bearer ${fakeSupabaseToken('aal2')}` });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.staff).toEqual({ userId: 'host-1', role: 'host', workerIds: ['W1', 'W2'] });
  });

  it('mặc định yêu cầu role admin khi route không khai báo @Roles() nào (host không qua được dù đã MFA)', async () => {
    const mockSupabase = makeSupabaseWithRole('host');
    const guard = new RoleGuard(makeReflector(undefined), mockSupabase);
    const { context } = makeContext({ authorization: `Bearer ${fakeSupabaseToken('aal2')}` });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

describe('ROLES_KEY', () => {
  it('là 1 hằng số metadata key ổn định (Reflector dùng để đọc @Roles())', () => {
    expect(ROLES_KEY).toBe('staffRoles');
  });
});
