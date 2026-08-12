import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import {
  WorkerEnrollmentService,
  generateCanonicalWorkerId,
} from './worker-enrollment.service';

const idA = 'cwsw_' + 'a'.repeat(32);
const idB = 'cwsw_' + 'b'.repeat(32);

function supabase(
  options: {
    insertError?: unknown;
    rpcData?: unknown;
    rpcError?: unknown;
    updateData?: unknown;
  } = {},
) {
  const insert = jest
    .fn()
    .mockResolvedValue({ error: options.insertError ?? null });
  const update = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: options.updateData ?? [{ controller_hash: 'h'.repeat(64) }],
        error: options.insertError ?? null,
      }),
    }),
  });
  const rpc = jest.fn().mockResolvedValue({
    data: options.rpcData ?? true,
    error: options.rpcError ?? null,
  });
  return {
    dependency: {
      getClient: () => ({
        from: () => ({ insert, update }),
        rpc,
      }),
    } as never,
    insert,
    update,
    rpc,
  };
}

describe('WorkerEnrollmentService', () => {
  it('generates a canonical 128-bit random Worker ID', () => {
    expect(generateCanonicalWorkerId()).toMatch(/^cwsw_[a-f0-9]{32}$/);
  });

  it('automatically provisions the same canonical identity on a retry', async () => {
    const db = supabase();
    db.rpc.mockResolvedValue({
      data: [{ worker_id: idA, ticket_hash: 'b'.repeat(64) }],
      error: null,
    });
    const result = await new WorkerEnrollmentService(db.dependency).provision({
      bootstrapToken: 'B'.repeat(43),
      fingerprintHash: 'f'.repeat(64),
    });
    expect(result.workerId).toBe(idA);
    expect(result.token).not.toBe('b'.repeat(64));
    expect(db.rpc).toHaveBeenCalledWith(
      'provision_worker',
      expect.objectContaining({
        p_fingerprint_hash: 'f'.repeat(64),
        p_worker_id: expect.stringMatching(/^cwsw_[a-f0-9]{32}$/),
      }),
    );
  });

  it('regenerates after a database uniqueness collision and never accepts the collided row', async () => {
    const db = supabase();
    db.rpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'workers_pkey' },
      })
      .mockResolvedValueOnce({
        data: [{ worker_id: idB, ticket_hash: 'c'.repeat(64) }],
        error: null,
      });
    const result = await new WorkerEnrollmentService(db.dependency).provision({
      bootstrapToken: 'B'.repeat(43),
      fingerprintHash: 'f'.repeat(64),
    });
    expect(result.workerId).toBe(idB);
    expect(db.rpc).toHaveBeenCalledTimes(2);
    expect(
      (db.rpc.mock.calls[0][1] as Record<string, unknown>).p_worker_id,
    ).not.toBe(
      (db.rpc.mock.calls[1][1] as Record<string, unknown>).p_worker_id,
    );
  });

  it('fails closed for a fingerprint or site bootstrap that is not valid', async () => {
    const db = supabase();
    const service = new WorkerEnrollmentService(db.dependency);
    await expect(
      service.provision({
        bootstrapToken: 'B'.repeat(43),
        fingerprintHash: 'not-a-hash',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('creates durable site-controller trust only through the Admin approval service boundary', async () => {
    const db = supabase();
    const result = await new WorkerEnrollmentService(
      db.dependency,
    ).approveSiteController(
      { fleetId: 2, quota: 3, capabilityTtlMinutes: 15 },
      'founder-user',
    );
    expect(result.controllerToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result).toMatchObject({
      fleetId: 2,
      quota: 3,
      capabilityTtlMinutes: 15,
    });
    const row = db.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toMatchObject({
      fleet_id: 2,
      quota: 3,
      capability_ttl_minutes: 15,
      created_by: 'founder-user',
    });
    expect(row.controller_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(row)).not.toContain(result.controllerToken);
  });

  it('renews a bounded capability through the approved controller without Admin AAL2', async () => {
    const db = supabase();
    db.rpc.mockResolvedValue({
      data: [{ fleet_id: 2, expires_at: '2030-01-01T00:00:00.000Z', quota: 3 }],
      error: null,
    });
    const result = await new WorkerEnrollmentService(
      db.dependency,
    ).issueSiteControllerCapability({ controllerToken: 'C'.repeat(43) });
    expect(result).toEqual({
      token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      fleetId: 2,
      expiresAt: '2030-01-01T00:00:00.000Z',
      quota: 3,
    });
    expect(db.rpc).toHaveBeenCalledWith('issue_site_bootstrap_capability', {
      p_controller_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      p_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it('passes the renewed site-scoped capability into normal automatic provisioning', async () => {
    const db = supabase();
    db.rpc
      .mockResolvedValueOnce({
        data: [
          { fleet_id: 2, expires_at: '2030-01-01T00:00:00.000Z', quota: 3 },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ worker_id: idA, ticket_hash: 'b'.repeat(64) }],
        error: null,
      });
    const service = new WorkerEnrollmentService(db.dependency);
    const capability = await service.issueSiteControllerCapability({
      controllerToken: 'C'.repeat(43),
    });
    const provisioned = await service.provision({
      bootstrapToken: capability.token,
      fingerprintHash: 'f'.repeat(64),
    });
    expect(provisioned.workerId).toBe(idA);
    expect(db.rpc).toHaveBeenNthCalledWith(
      2,
      'provision_worker',
      expect.objectContaining({
        p_bootstrap_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        p_fingerprint_hash: 'f'.repeat(64),
      }),
    );
  });

  it('rejects malformed or revoked-controller responses without exposing capability state', async () => {
    const db = supabase({ rpcData: null });
    const service = new WorkerEnrollmentService(db.dependency);
    await expect(
      service.issueSiteControllerCapability({ controllerToken: 'short' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.issueSiteControllerCapability({
        controllerToken: 'C'.repeat(43),
      }),
    ).rejects.toEqual(new UnauthorizedException('Invalid site controller'));
  });

  it('keeps suspension and revocation behind the Admin boundary', async () => {
    const db = supabase();
    await expect(
      new WorkerEnrollmentService(db.dependency).setSiteControllerStatus(
        { fleetId: 2, status: 'suspended' },
        'admin-user',
      ),
    ).resolves.toEqual({ fleetId: 2, status: 'suspended' });
    expect(db.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'suspended',
        status_changed_by: 'admin-user',
      }),
    );
  });

  it('does not report a status change when the site-controller trust row is absent', async () => {
    const db = supabase({ updateData: [] });
    await expect(
      new WorkerEnrollmentService(db.dependency).setSiteControllerStatus(
        { fleetId: 999, status: 'revoked' },
        'admin-user',
      ),
    ).rejects.toThrow('Site controller trust was not found');
  });
  it('issues unique per-worker tickets and stores hashes only', async () => {
    const db = supabase();
    const result = await new WorkerEnrollmentService(db.dependency).issueBatch(
      { workerIds: [idA, idB], fleetId: 2 },
      'staff-user',
    );
    expect(result.tickets).toHaveLength(2);
    expect(result.tickets[0].token).not.toEqual(result.tickets[1].token);
    const rows = db.insert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows)).not.toContain(result.tickets[0].token);
    expect(rows[0]).toMatchObject({
      expected_worker_id: idA,
      fleet_id: 2,
      created_by: 'staff-user',
    });
  });

  it('rejects duplicate, malformed and oversized batches', async () => {
    const service = new WorkerEnrollmentService(supabase().dependency);
    await expect(
      service.issueBatch({ workerIds: [idA, idA], fleetId: 2 }, 'u'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.issueBatch({ workerIds: ['bad id'], fleetId: 2 }, 'u'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.issueBatch(
        {
          workerIds: Array.from(
            { length: 101 },
            (_, i) => `cwsw_${i.toString(16).padStart(32, '0')}`,
          ),
          fleetId: 2,
        },
        'u',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('redeems through the atomic hash-only RPC', async () => {
    const db = supabase();
    const result = await new WorkerEnrollmentService(db.dependency).redeem({
      token: 'T'.repeat(43),
      workerId: idA,
      credentialHash: 'a'.repeat(64),
      hostname: 'MAY083',
      gpuName: 'GPU',
      vramMb: 8192,
    });
    expect(result).toEqual({ workerId: idA });
    const [, payload] = db.rpc.mock.calls[0];
    expect(payload.p_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.p_token_hash).not.toEqual('T'.repeat(43));
    expect(payload).toMatchObject({
      p_worker_id: idA,
      p_credential_hash: 'a'.repeat(64),
      p_hostname: 'MAY083',
      p_vram_mb: 8192,
    });
  });

  it('fails closed without exposing invalid, expired or replayed ticket state', async () => {
    const service = new WorkerEnrollmentService(
      supabase({ rpcData: false }).dependency,
    );
    await expect(
      service.redeem({
        token: 'T'.repeat(43),
        workerId: idA,
        credentialHash: 'a'.repeat(64),
      }),
    ).rejects.toEqual(new UnauthorizedException('Invalid Worker enrollment'));
  });

  it('rejects malformed enrollment before database access', async () => {
    const db = supabase();
    await expect(
      new WorkerEnrollmentService(db.dependency).redeem({
        token: 'short',
        workerId: idA,
        credentialHash: 'not-a-hash',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
