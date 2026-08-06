import { UnauthorizedException } from '@nestjs/common';
import { JobsController } from './jobs.controller';

describe('JobsController.listAll authorization', () => {
  const order = {
    id: 'job-1',
    customerId: 'customer-1',
    status: 'QUEUED',
  } as never;

  const adminToken = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ aal: 'aal2' })).toString('base64url')}.signature`;

  function makeController(authUser: { id: string } | null, role: 'admin' | 'customer' | null) {
    const jobsService = {
      listAll: jest.fn().mockResolvedValue([order]),
    };
    const supabaseService = {
      getClient: () => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: authUser },
            error: authUser ? null : new Error('unauthorized'),
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: role === 'admin' ? { role: 'admin' } : null,
                error: null,
              }),
            })),
          })),
        })),
      }),
    };
    const configService = { get: jest.fn().mockReturnValue(null) };
    return {
      controller: new JobsController(
        jobsService as never,
        supabaseService as never,
        configService as never,
      ),
      listAll: jobsService.listAll,
    };
  }

  it('lists all jobs for an authenticated AAL2 admin, not the admin user customer scope', async () => {
    const { controller, listAll } = makeController({ id: 'staff-1' }, 'admin');
    const result = await controller.listAll({ headers: { authorization: `Bearer ${adminToken}` }, query: {} } as never);

    expect(result).toHaveLength(1);
    expect(listAll).toHaveBeenCalledWith(null);
  });

  it('keeps authenticated customer history scoped to that customer', async () => {
    const { controller, listAll } = makeController({ id: 'customer-1' }, 'customer');
    const result = await controller.listAll({ headers: { authorization: 'Bearer customer-token' }, query: {} } as never);

    expect(result).toHaveLength(1);
    expect(listAll).toHaveBeenCalledWith('customer-1');
  });

  it('denies anonymous list access instead of exposing all jobs', async () => {
    const { controller, listAll } = makeController(null, null);

    await expect(controller.listAll({ headers: {}, query: {} } as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(listAll).not.toHaveBeenCalled();
  });
});
