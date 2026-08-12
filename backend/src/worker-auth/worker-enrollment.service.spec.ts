import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { WorkerEnrollmentService, generateCanonicalWorkerId } from './worker-enrollment.service';

const idA = 'cwsw_' + 'a'.repeat(32);
const idB = 'cwsw_' + 'b'.repeat(32);

function supabase(
  options: {
    insertError?: unknown;
    rpcData?: unknown;
    rpcError?: unknown;
  } = {},
) {
  const insert = jest
    .fn()
    .mockResolvedValue({ error: options.insertError ?? null });
  const rpc = jest.fn().mockResolvedValue({
    data: options.rpcData ?? true,
    error: options.rpcError ?? null,
  });
  return {
    dependency: {
      getClient: () => ({
        from: () => ({ insert }),
        rpc,
      }),
    } as never,
    insert,
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
    expect(db.rpc).toHaveBeenCalledWith('provision_worker', expect.objectContaining({
      p_fingerprint_hash: 'f'.repeat(64),
      p_worker_id: expect.stringMatching(/^cwsw_[a-f0-9]{32}$/),
    }));
  });

  it('regenerates after a database uniqueness collision and never accepts the collided row', async () => {
    const db = supabase();
    db.rpc
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'workers_pkey' } })
      .mockResolvedValueOnce({ data: [{ worker_id: idB, ticket_hash: 'c'.repeat(64) }], error: null });
    const result = await new WorkerEnrollmentService(db.dependency).provision({
      bootstrapToken: 'B'.repeat(43), fingerprintHash: 'f'.repeat(64),
    });
    expect(result.workerId).toBe(idB);
    expect(db.rpc).toHaveBeenCalledTimes(2);
    expect((db.rpc.mock.calls[0][1] as Record<string, unknown>).p_worker_id)
      .not.toBe((db.rpc.mock.calls[1][1] as Record<string, unknown>).p_worker_id);
  });

  it('fails closed for a fingerprint or site bootstrap that is not valid', async () => {
    const db = supabase();
    const service = new WorkerEnrollmentService(db.dependency);
    await expect(service.provision({
      bootstrapToken: 'B'.repeat(43), fingerprintHash: 'not-a-hash',
    })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.rpc).not.toHaveBeenCalled();
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
          workerIds: Array.from({ length: 101 }, (_, i) => `cwsw_${i.toString(16).padStart(32, '0')}`),
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
