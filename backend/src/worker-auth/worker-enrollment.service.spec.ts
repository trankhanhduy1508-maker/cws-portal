import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { WorkerEnrollmentService } from './worker-enrollment.service';

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
  it('issues unique per-worker tickets and stores hashes only', async () => {
    const db = supabase();
    const result = await new WorkerEnrollmentService(db.dependency).issueBatch(
      { workerIds: ['CWS-A', 'CWS-B'], fleetId: 2 },
      'staff-user',
    );
    expect(result.tickets).toHaveLength(2);
    expect(result.tickets[0].token).not.toEqual(result.tickets[1].token);
    const rows = db.insert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows)).not.toContain(result.tickets[0].token);
    expect(rows[0]).toMatchObject({
      expected_worker_id: 'CWS-A',
      fleet_id: 2,
      created_by: 'staff-user',
    });
  });

  it('rejects duplicate, malformed and oversized batches', async () => {
    const service = new WorkerEnrollmentService(supabase().dependency);
    await expect(
      service.issueBatch({ workerIds: ['CWS-A', 'CWS-A'], fleetId: 2 }, 'u'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.issueBatch({ workerIds: ['bad id'], fleetId: 2 }, 'u'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.issueBatch(
        {
          workerIds: Array.from({ length: 101 }, (_, i) => `CWS-${i}`),
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
      workerId: 'CWS-A',
      credentialHash: 'a'.repeat(64),
      hostname: 'MAY083',
      gpuName: 'GPU',
      vramMb: 8192,
    });
    expect(result).toEqual({ workerId: 'CWS-A' });
    const [, payload] = db.rpc.mock.calls[0];
    expect(payload.p_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.p_token_hash).not.toEqual('T'.repeat(43));
    expect(payload).toMatchObject({
      p_worker_id: 'CWS-A',
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
        workerId: 'CWS-A',
        credentialHash: 'a'.repeat(64),
      }),
    ).rejects.toEqual(new UnauthorizedException('Invalid Worker enrollment'));
  });

  it('rejects malformed enrollment before database access', async () => {
    const db = supabase();
    await expect(
      new WorkerEnrollmentService(db.dependency).redeem({
        token: 'short',
        workerId: 'CWS-A',
        credentialHash: 'not-a-hash',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
