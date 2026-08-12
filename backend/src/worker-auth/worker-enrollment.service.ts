import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

export const CANONICAL_WORKER_ID = /^cwsw_[a-f0-9]{32}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_ID_ALLOCATION_ATTEMPTS = 5;

export function generateCanonicalWorkerId(): string {
  return `cwsw_${randomBytes(16).toString('hex')}`;
}

export interface IssueEnrollmentInput {
  workerIds: string[];
  fleetId: number;
  expiresMinutes?: number;
}

export interface RedeemEnrollmentInput {
  token: string;
  workerId: string;
  credentialHash: string;
  fingerprintHash?: string;
  hostname?: string;
  gpuName?: string;
  vramMb?: number;
}

export interface SiteBootstrapInput {
  fleetId: number;
  expiresMinutes?: number;
  quota?: number;
}

export interface SiteControllerApprovalInput {
  fleetId: number;
  quota?: number;
  capabilityTtlMinutes?: number;
}

export interface SiteControllerCapabilityInput {
  controllerToken: string;
}

export interface SiteControllerStatusInput {
  fleetId: number;
  status: 'approved' | 'suspended' | 'revoked';
}

export interface AutomaticProvisionInput {
  bootstrapToken: string;
  fingerprintHash: string;
  hostname?: string;
  gpuName?: string;
  vramMb?: number;
}

@Injectable()
export class WorkerEnrollmentService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async issueSiteBootstrap(input: SiteBootstrapInput, staffUserId: string) {
    if (!Number.isInteger(input.fleetId) || input.fleetId < 1) {
      throw new BadRequestException('Fleet ID is invalid');
    }
    const expiresMinutes = input.expiresMinutes ?? 24 * 60;
    const quota = input.quota ?? 100;
    if (
      !Number.isInteger(expiresMinutes) ||
      expiresMinutes < 5 ||
      expiresMinutes > 30 * 24 * 60
    ) {
      throw new BadRequestException('Bootstrap expiry is invalid');
    }
    if (!Number.isInteger(quota) || quota < 1 || quota > 1_000_000) {
      throw new BadRequestException('Bootstrap quota is invalid');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + expiresMinutes * 60_000,
    ).toISOString();
    const { error } = await this.supabaseService
      .getClient()
      .from('worker_site_bootstrap_capabilities')
      .insert({
        token_hash: this.hash(token),
        fleet_id: input.fleetId,
        expires_at: expiresAt,
        quota,
        created_by: staffUserId,
      });
    if (error)
      throw new InternalServerErrorException(
        'Could not issue site bootstrap capability',
      );
    return { token, expiresAt, quota };
  }

  async approveSiteController(
    input: SiteControllerApprovalInput,
    staffUserId: string,
  ) {
    if (!Number.isInteger(input.fleetId) || input.fleetId < 1) {
      throw new BadRequestException('Fleet ID is invalid');
    }
    const quota = input.quota ?? 100;
    const capabilityTtlMinutes = input.capabilityTtlMinutes ?? 30;
    if (!Number.isInteger(quota) || quota < 1 || quota > 1_000_000) {
      throw new BadRequestException('Controller quota is invalid');
    }
    if (
      !Number.isInteger(capabilityTtlMinutes) ||
      capabilityTtlMinutes < 5 ||
      capabilityTtlMinutes > 60
    ) {
      throw new BadRequestException('Controller capability TTL is invalid');
    }
    const controllerToken = randomBytes(32).toString('base64url');
    const { error } = await this.supabaseService
      .getClient()
      .from('worker_site_controller_trust')
      .insert({
        controller_hash: this.hash(controllerToken),
        fleet_id: input.fleetId,
        quota,
        capability_ttl_minutes: capabilityTtlMinutes,
        created_by: staffUserId,
      });
    if (error)
      throw new InternalServerErrorException(
        'Could not approve site controller',
      );
    return {
      controllerToken,
      fleetId: input.fleetId,
      quota,
      capabilityTtlMinutes,
    };
  }

  async setSiteControllerStatus(
    input: SiteControllerStatusInput,
    staffUserId: string,
  ) {
    if (
      !Number.isInteger(input.fleetId) ||
      input.fleetId < 1 ||
      !['approved', 'suspended', 'revoked'].includes(input.status)
    ) {
      throw new BadRequestException('Site controller status is invalid');
    }
    const { data, error } = await this.supabaseService
      .getClient()
      .from('worker_site_controller_trust')
      .update({
        status: input.status,
        status_changed_by: staffUserId,
        status_changed_at: new Date().toISOString(),
      })
      .eq('fleet_id', input.fleetId)
      .select('controller_hash');
    if (error)
      throw new InternalServerErrorException(
        'Could not update site controller status',
      );
    if (!data?.length) {
      throw new NotFoundException('Site controller trust was not found');
    }
    return { fleetId: input.fleetId, status: input.status };
  }

  async issueSiteControllerCapability(input: SiteControllerCapabilityInput) {
    if (
      !input ||
      typeof input.controllerToken !== 'string' ||
      !/^[A-Za-z0-9_-]{40,128}$/.test(input.controllerToken)
    ) {
      throw new UnauthorizedException('Invalid site controller');
    }
    const capabilityToken = randomBytes(32).toString('base64url');
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc('issue_site_bootstrap_capability', {
        p_controller_hash: this.hash(input.controllerToken),
        p_token_hash: this.hash(capabilityToken),
      });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.fleet_id || !row?.expires_at || !row?.quota) {
      throw new UnauthorizedException('Invalid site controller');
    }
    return {
      token: capabilityToken,
      fleetId: row.fleet_id,
      expiresAt: row.expires_at,
      quota: row.quota,
    };
  }

  async provision(input: AutomaticProvisionInput) {
    if (
      !/^[A-Za-z0-9_-]{40,128}$/.test(input.bootstrapToken) ||
      !SHA256.test(input.fingerprintHash)
    ) {
      throw new UnauthorizedException('Invalid Worker provisioning');
    }
    if (
      input.hostname !== undefined &&
      (typeof input.hostname !== 'string' || input.hostname.length > 255)
    ) {
      throw new UnauthorizedException('Invalid Worker provisioning');
    }
    if (
      input.gpuName !== undefined &&
      (typeof input.gpuName !== 'string' || input.gpuName.length > 240)
    ) {
      throw new UnauthorizedException('Invalid Worker provisioning');
    }
    if (
      input.vramMb !== undefined &&
      (!Number.isInteger(input.vramMb) || input.vramMb < 0)
    ) {
      throw new UnauthorizedException('Invalid Worker provisioning');
    }

    for (let attempt = 0; attempt < MAX_ID_ALLOCATION_ATTEMPTS; attempt += 1) {
      const workerId = generateCanonicalWorkerId();
      const enrollmentToken = randomBytes(32).toString('base64url');
      const { data, error } = await this.supabaseService
        .getClient()
        .rpc('provision_worker', {
          p_bootstrap_hash: this.hash(input.bootstrapToken),
          p_fingerprint_hash: input.fingerprintHash,
          p_worker_id: workerId,
          p_ticket_hash: this.hash(enrollmentToken),
          p_hostname: input.hostname?.trim() || null,
          p_gpu_name: input.gpuName?.trim() || null,
          p_vram_mb: input.vramMb ?? 0,
          p_ticket_expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
        });
      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row?.worker_id && row?.ticket_hash) {
        return { workerId: row.worker_id, token: enrollmentToken };
      }
      // A unique worker_id collision is the only retryable allocation failure.
      // The RPC must not update the collided row; all other errors fail closed.
      if (
        error?.code !== '23505' ||
        !/(workers_pkey|workers_worker_id)/i.test(String(error.message ?? ''))
      ) {
        throw new UnauthorizedException('Invalid Worker provisioning');
      }
    }
    throw new InternalServerErrorException(
      'Worker identity allocation exhausted',
    );
  }

  async issueBatch(input: IssueEnrollmentInput, staffUserId: string) {
    const workerIds = input.workerIds;
    if (
      !Array.isArray(workerIds) ||
      workerIds.length < 1 ||
      workerIds.length > 100 ||
      workerIds.some(
        (id) => typeof id !== 'string' || !CANONICAL_WORKER_ID.test(id),
      ) ||
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
      !CANONICAL_WORKER_ID.test(input.workerId) ||
      typeof input.credentialHash !== 'string' ||
      !SHA256.test(input.credentialHash) ||
      (input.fingerprintHash !== undefined &&
        !SHA256.test(input.fingerprintHash)) ||
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
        p_fingerprint_hash: input.fingerprintHash ?? null,
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
