import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

const WORKER_ID = /^[A-Za-z0-9._~-]{1,128}$/;
const SHA256 = /^[a-f0-9]{64}$/;

export interface IssueEnrollmentInput {
  workerIds: string[];
  fleetId: number;
  expiresMinutes?: number;
}

export interface RedeemEnrollmentInput {
  token: string;
  workerId: string;
  credentialHash: string;
  hostname?: string;
  gpuName?: string;
  vramMb?: number;
}

@Injectable()
export class WorkerEnrollmentService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async issueBatch(input: IssueEnrollmentInput, staffUserId: string) {
    const workerIds = input.workerIds;
    if (
      !Array.isArray(workerIds) ||
      workerIds.length < 1 ||
      workerIds.length > 100 ||
      workerIds.some((id) => typeof id !== 'string' || !WORKER_ID.test(id)) ||
      new Set(workerIds).size !== workerIds.length
    ) {
      throw new BadRequestException('Worker ID batch is invalid');
    }
    if (!Number.isInteger(input.fleetId) || input.fleetId < 1) {
      throw new BadRequestException('Fleet ID is invalid');
    }
    const expiresMinutes = input.expiresMinutes ?? 30;
    if (
      !Number.isInteger(expiresMinutes) ||
      expiresMinutes < 5 ||
      expiresMinutes > 60
    ) {
      throw new BadRequestException('Enrollment expiry is invalid');
    }

    const expiresAt = new Date(
      Date.now() + expiresMinutes * 60_000,
    ).toISOString();
    const tickets = workerIds.map((workerId) => ({
      workerId,
      token: randomBytes(32).toString('base64url'),
    }));
    const rows = tickets.map(({ workerId, token }) => ({
      token_hash: this.hash(token),
      expected_worker_id: workerId,
      fleet_id: input.fleetId,
      expires_at: expiresAt,
      created_by: staffUserId,
    }));
    const { error } = await this.supabaseService
      .getClient()
      .from('worker_enrollment_tickets')
      .insert(rows);
    if (error) {
      throw new InternalServerErrorException(
        'Could not issue Worker enrollment tickets',
      );
    }
    return { expiresAt, tickets };
  }

  async redeem(input: RedeemEnrollmentInput): Promise<{ workerId: string }> {
    if (
      typeof input.token !== 'string' ||
      !/^[A-Za-z0-9_-]{40,128}$/.test(input.token) ||
      typeof input.workerId !== 'string' ||
      !WORKER_ID.test(input.workerId) ||
      typeof input.credentialHash !== 'string' ||
      !SHA256.test(input.credentialHash) ||
      (input.hostname !== undefined &&
        (typeof input.hostname !== 'string' || input.hostname.length > 255)) ||
      (input.gpuName !== undefined &&
        (typeof input.gpuName !== 'string' || input.gpuName.length > 240)) ||
      (input.vramMb !== undefined &&
        (!Number.isInteger(input.vramMb) || input.vramMb < 0))
    ) {
      throw new UnauthorizedException('Invalid Worker enrollment');
    }

    const credentialExpiresAt = new Date(
      Date.now() + 90 * 24 * 60 * 60_000,
    ).toISOString();
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('consume_worker_enrollment', {
        p_token_hash: this.hash(input.token),
        p_worker_id: input.workerId,
        p_credential_hash: input.credentialHash,
        p_hostname: input.hostname?.trim() || null,
        p_gpu_name: input.gpuName?.trim() || null,
        p_vram_mb: input.vramMb ?? 0,
        p_expires_at: credentialExpiresAt,
      });
    if (error || data !== true) {
      // Ticket existence, expiry and replay state are deliberately hidden.
      throw new UnauthorizedException('Invalid Worker enrollment');
    }
    return { workerId: input.workerId };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }
}
