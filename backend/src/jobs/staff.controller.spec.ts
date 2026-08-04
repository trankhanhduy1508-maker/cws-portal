import { ForbiddenException } from '@nestjs/common';
import { StaffController } from './staff.controller';

function controllerFor(role: 'admin' | 'host' | null) {
  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: role ? { role } : null, error: null }),
        }),
      }),
    }),
  };
  const supabase = { getClient: () => client } as any;
  return new StaffController({} as any, supabase);
}

describe('StaffController OAuth access preflight', () => {
  it('returns the server-side Admin role for an authorized user', async () => {
    await expect(controllerFor('admin').access({ headers: { authorization: 'Bearer token' } } as any))
      .resolves.toEqual({ userId: 'user-1', role: 'admin' });
  });

  it('denies an authenticated Google/customer user without staff_roles', async () => {
    await expect(controllerFor(null).access({ headers: { authorization: 'Bearer token' } } as any))
      .rejects.toThrow(ForbiddenException);
  });
});
