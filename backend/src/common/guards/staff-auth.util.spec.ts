import { SupabaseService } from '../../supabase/supabase.service';
import { isAuthenticatedMfaAdmin } from './staff-auth.util';

function makeRequest(overrides: { authorization?: string; staffToken?: string }) {
  return {
    headers: overrides.authorization ? { authorization: overrides.authorization } : {},
    query: overrides.staffToken ? { staffToken: overrides.staffToken } : {},
  } as unknown as Parameters<typeof isAuthenticatedMfaAdmin>[0];
}

function makeToken(aal: 'aal1' | 'aal2' | undefined): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(aal ? { aal } : {})).toString('base64url');
  return `${header}.${payload}.sig`;
}

function makeSupabase(role: 'admin' | 'host' | null, userExists = true): SupabaseService {
  return {
    getClient: () => ({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue(
            userExists
              ? { data: { user: { id: 'staff-1' } }, error: null }
              : { data: { user: null }, error: { message: 'invalid' } },
          ),
      },
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: role ? { role } : null }) }),
        }),
      }),
    }),
  } as unknown as SupabaseService;
}

describe('isAuthenticatedMfaAdmin (dùng chung cho JobsController#isAdminRequest legacy routes)', () => {
  it('false khi không có Bearer header lẫn query staffToken', async () => {
    await expect(isAuthenticatedMfaAdmin(makeRequest({}), makeSupabase('admin'))).resolves.toBe(false);
  });

  it('false khi token không đạt aal2', async () => {
    const req = makeRequest({ authorization: `Bearer ${makeToken('aal1')}` });
    await expect(isAuthenticatedMfaAdmin(req, makeSupabase('admin'))).resolves.toBe(false);
  });

  it('false khi token aal2 nhưng getUser thất bại (token giả/hết hạn)', async () => {
    const req = makeRequest({ authorization: `Bearer ${makeToken('aal2')}` });
    await expect(isAuthenticatedMfaAdmin(req, makeSupabase('admin', false))).resolves.toBe(false);
  });

  it('false khi user hợp lệ + aal2 nhưng role KHÔNG phải admin (vd host)', async () => {
    const req = makeRequest({ authorization: `Bearer ${makeToken('aal2')}` });
    await expect(isAuthenticatedMfaAdmin(req, makeSupabase('host'))).resolves.toBe(false);
  });

  it('true khi Bearer header hợp lệ, aal2, role admin', async () => {
    const req = makeRequest({ authorization: `Bearer ${makeToken('aal2')}` });
    await expect(isAuthenticatedMfaAdmin(req, makeSupabase('admin'))).resolves.toBe(true);
  });

  it('true khi dùng query ?staffToken= (cho link tải trực tiếp, không set được header)', async () => {
    const req = makeRequest({ staffToken: makeToken('aal2') });
    await expect(isAuthenticatedMfaAdmin(req, makeSupabase('admin'))).resolves.toBe(true);
  });
});
