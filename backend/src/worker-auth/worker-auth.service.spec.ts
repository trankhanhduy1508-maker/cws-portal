import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WorkerAuthService } from './worker-auth.service';
import { canonicalWorkerRequest, sha256Hex } from './worker-auth.contract';

const workerId = 'worker-a';
const token = 'A'.repeat(40);
const body = Buffer.from('{"state":"ACTIVE_IDLE"}');

type TestRequest = {
  method: string;
  originalUrl: string;
  rawBody: Buffer;
  body: Record<string, unknown>;
  headers: Record<string, string>;
};

function request(overrides: Partial<TestRequest> = {}): TestRequest {
  const timestamp = String(Math.floor(Date.now() / 1000)).padStart(10, '0');
  const nonce = 'nonce-1234567890';
  const signature = createHmac('sha256', token)
    .update(canonicalWorkerRequest({ workerId, timestamp, nonce, method: 'POST', path: '/worker/rpc/worker_ping', body }))
    .digest('hex');
  return {
    method: 'POST',
    originalUrl: '/worker/rpc/worker_ping',
    rawBody: body,
    body: JSON.parse(body.toString()),
    headers: {
      authorization: `Worker ${token}`,
      'x-cws-worker-id': workerId,
      'x-cws-worker-timestamp': timestamp,
      'x-cws-worker-nonce': nonce,
      'x-cws-worker-signature': signature,
    },
    ...overrides,
  };
}

function makeSupabase(identity: Record<string, unknown> | null, nonceError: unknown = null) {
  const client = {
    from: jest.fn((table: string) => {
      if (table === 'worker_identities') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: jest.fn().mockResolvedValue({ data: identity, error: null }) }),
          }),
        };
      }
      return { insert: jest.fn().mockResolvedValue({ error: nonceError }) };
    }),
  };
  return { getClient: () => client } as never;
}

describe('WorkerAuthService', () => {
  const active = {
    worker_id: workerId,
    credential_hash: sha256Hex(token),
    status: 'active',
    expires_at: null,
    revoked_at: null,
  };

  it('accepts a valid per-worker proof and consumes its nonce', async () => {
    const service = new WorkerAuthService(makeSupabase(active));
    await expect(service.authenticate(request() as never)).resolves.toEqual({ workerId });
  });

  it('rejects an impersonated worker id even with a valid token for another id', async () => {
    const service = new WorkerAuthService(makeSupabase(null));
    await expect(service.authenticate(request({
      headers: { ...request().headers, 'x-cws-worker-id': 'worker-victim' },
    }) as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects revoked and expired credentials', async () => {
    const revoked = { ...active, status: 'revoked' };
    await expect(new WorkerAuthService(makeSupabase(revoked)).authenticate(request() as never)).rejects.toBeInstanceOf(UnauthorizedException);
    const expired = { ...active, expires_at: new Date(Date.now() - 1000).toISOString() };
    await expect(new WorkerAuthService(makeSupabase(expired)).authenticate(request() as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects replayed nonce and does not reveal database details', async () => {
    const service = new WorkerAuthService(makeSupabase(active, { code: '23505', message: 'duplicate key' }));
    await expect(service.authenticate(request() as never)).rejects.toEqual(expect.any(UnauthorizedException));
    await expect(service.authenticate(request() as never)).rejects.not.toThrow('duplicate key');
  });

  it('rejects tampered body and stale proof', async () => {
    const service = new WorkerAuthService(makeSupabase(active));
    const valid = request();
    await expect(service.authenticate({ ...valid, rawBody: Buffer.from('{"state":"RENDERING"}') } as never)).rejects.toBeInstanceOf(UnauthorizedException);
    const stale = request({
      headers: { ...valid.headers, 'x-cws-worker-timestamp': '1000000000' },
    });
    await expect(service.authenticate(stale as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
