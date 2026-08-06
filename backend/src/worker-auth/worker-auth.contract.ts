import { createHash, createHmac, timingSafeEqual } from 'crypto';

export const WORKER_AUTH_SCHEME = 'Worker';
export const WORKER_CLOCK_SKEW_SECONDS = 300;
export const WORKER_NONCE_TTL_SECONDS = WORKER_CLOCK_SKEW_SECONDS * 2;

export interface WorkerAuthInput {
  workerId: string;
  token: string;
  timestamp: string;
  nonce: string;
  signature: string;
  method: string;
  path: string;
  body: Buffer;
  nowSeconds?: number;
}

export interface WorkerIdentityRecord {
  worker_id: string;
  credential_hash: string;
  status: 'active' | 'revoked';
  expires_at: string | null;
  revoked_at: string | null;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function canonicalWorkerRequest(input: {
  workerId: string;
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
  body: Buffer;
}): string {
  const bodyHash = createHash('sha256').update(input.body).digest('hex');
  return [
    input.workerId,
    input.timestamp,
    input.nonce,
    input.method.toUpperCase(),
    input.path,
    bodyHash,
  ].join('\n');
}

export function verifyWorkerProof(input: WorkerAuthInput): string | null {
  if (!/^[A-Za-z0-9._~-]{1,128}$/.test(input.workerId)) return 'invalid worker id';
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(input.token)) return 'invalid worker token';
  if (!/^\d{10}$/.test(input.timestamp)) return 'invalid timestamp';
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(input.nonce)) return 'invalid nonce';
  if (!/^[a-f0-9]{64}$/.test(input.signature)) return 'invalid signature';

  const timestamp = Number(input.timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > WORKER_CLOCK_SKEW_SECONDS) {
    return 'stale timestamp';
  }

  const expected = createHmac('sha256', input.token)
    .update(canonicalWorkerRequest(input))
    .digest();
  const supplied = Buffer.from(input.signature, 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return 'invalid proof';
  }
  return null;
}
