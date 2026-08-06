import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { StaffIdentityGuard } from './staff-identity.guard';

function context(headers: Record<string, string>) {
  const request: { headers: Record<string, string>; staff?: unknown } = { headers };
  return {
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext,
    request,
  };
}

function supabase(role: 'admin' | 'host' | null): SupabaseService {
  return {
    getClient: () => ({
      auth: {
        getUser: jest.fn().mockResolvedValue(
          role
            ? { data: { user: { id: 'staff-1' } }, error: null }
            : { data: { user: { id: 'customer-1' } }, error: null },
        ),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: jest.fn().mockResolvedValue(
              role ? { data: { role }, error: null } : { data: null, error: null },
            ),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseService;
}

describe('StaffIdentityGuard pre-MFA onboarding boundary', () => {
  it('rejects anonymous requests', async () => {
    const { context: requestContext } = context({});
    await expect(new StaffIdentityGuard({} as SupabaseService).canActivate(requestContext))
      .rejects.toThrow(UnauthorizedException);
  });

  it('rejects an authenticated customer without staff_roles', async () => {
    const { context: requestContext } = context({ authorization: 'Bearer customer' });
    await expect(new StaffIdentityGuard(supabase(null)).canActivate(requestContext))
      .rejects.toThrow(ForbiddenException);
  });

  it('accepts staff identity before MFA only for onboarding status', async () => {
    const { context: requestContext, request } = context({ authorization: 'Bearer staff' });
    await expect(new StaffIdentityGuard(supabase('admin')).canActivate(requestContext))
      .resolves.toBe(true);
    expect(request.staff).toEqual({ userId: 'staff-1', role: 'admin', workerIds: [] });
  });

  it('does not inspect or accept an x-admin-key bypass', async () => {
    const { context: requestContext } = context({ 'x-admin-key': 'anything' });
    await expect(new StaffIdentityGuard({} as SupabaseService).canActivate(requestContext))
      .rejects.toThrow(UnauthorizedException);
  });
});
