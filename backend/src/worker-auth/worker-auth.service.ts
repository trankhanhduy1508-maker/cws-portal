import { Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import {
  sha256Hex,
  verifyWorkerProof,
  WorkerAuthInput,
  WorkerIdentityRecord,
  WORKER_NONCE_TTL_SECONDS,
} from './worker-auth.contract';

export interface AuthenticatedWorker {
  workerId: string;
}

declare module 'express' {
  interface Request {
    workerIdentity?: AuthenticatedWorker;
  }
}

@Injectable()
export class WorkerAuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async authenticate(request: Request): Promise<AuthenticatedWorker> {
    const authorization = request.headers.authorization ?? '';
    const [scheme, token] = authorization.split(' ');
    const workerId = this.header(request, 'x-cws-worker-id');
    const timestamp = this.header(request, 'x-cws-worker-timestamp');
    const nonce = this.header(request, 'x-cws-worker-nonce');
    const signature = this.header(request, 'x-cws-worker-signature');
    const body =
      (request as Request & { rawBody?: Buffer }).rawBody ??
      Buffer.from(JSON.stringify(request.body ?? {}), 'utf8');

    if (
      scheme !== 'Worker' ||
      !token ||
      !workerId ||
      !timestamp ||
      !nonce ||
      !signature
    ) {
      throw new UnauthorizedException('Invalid Worker authentication');
    }

    const proof: WorkerAuthInput = {
      workerId,
      token,
      timestamp,
      nonce,
      signature,
      method: request.method,
      path: request.originalUrl.split('?')[0],
      body,
    };
    const proofError = verifyWorkerProof(proof);
    if (proofError)
      throw new UnauthorizedException('Invalid Worker authentication');

    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('worker_identities')
      .select('worker_id, credential_hash, status, expires_at, revoked_at')
      .eq('worker_id', workerId)
      .maybeSingle();
    if (error || !data)
      throw new UnauthorizedException('Invalid Worker authentication');

    const identity = data as WorkerIdentityRecord;
    if (identity.status !== 'active' || identity.revoked_at) {
      throw new UnauthorizedException('Invalid Worker authentication');
    }
    if (identity.expires_at && Date.parse(identity.expires_at) <= Date.now()) {
      throw new UnauthorizedException('Invalid Worker authentication');
    }
    const expectedHash = Buffer.from(identity.credential_hash, 'ascii');
    const receivedHash = Buffer.from(sha256Hex(token), 'ascii');
    if (
      expectedHash.length !== receivedHash.length ||
      !timingSafeEqual(expectedHash, receivedHash)
    ) {
      throw new UnauthorizedException('Invalid Worker authentication');
    }

    const { error: nonceError } = await client
      .from('worker_auth_nonces')
      .insert({
        worker_id: workerId,
        nonce,
        expires_at: new Date(
          Date.now() + WORKER_NONCE_TTL_SECONDS * 1000,
        ).toISOString(),
      });
    if (nonceError) {
      // A unique violation means this exact proof was replayed. Other database
      // failures also fail closed; the caller never receives database details.
      throw new UnauthorizedException('Invalid Worker authentication');
    }

    return { workerId };
  }

  private header(request: Request, name: string): string | null {
    const value = request.headers[name];
    if (Array.isArray(value)) return value[0] ?? null;
    return typeof value === 'string' ? value : null;
  }
}
