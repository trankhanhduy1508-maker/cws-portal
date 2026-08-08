import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type WorkerRpcBody = Record<string, unknown>;

const RPC_NAMES = new Set([
  'worker_ping',
  'claim_next_task',
  'claim_next_resilient_task',
  'get_claimed_task_spec',
  'report_heartbeat',
  'complete_task',
  'fail_task',
  'update_task_stage',
  'report_worker_state_transition',
  'report_worker_failure',
  'report_worker_probe',
]);

const WORKER_STATES = new Set([
  'ACTIVE_IDLE',
  'PREPARING',
  'RENDERING',
  'RECOVERY',
  'CLEANUP',
]);

const FAILURE_CATEGORIES = new Set([
  'CUSTOMER_INPUT_ERROR',
  'CAPABILITY_MISMATCH',
  'BLENDER_RENDER_ERROR',
  'WORKER_HOST_ERROR',
  'STORAGE_TRANSIENT',
  'BACKEND_TRANSIENT',
  'NETWORK_TRANSIENT',
  'SECURITY_VIOLATION',
]);

const PROBE_STATES = new Set(['PROBING', 'OK', 'FAILED']);

@Injectable()
export class WorkerRpcService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async call(
    operation: string,
    workerId: string,
    body: WorkerRpcBody,
  ): Promise<unknown> {
    if (!RPC_NAMES.has(operation))
      throw new BadRequestException('Unsupported Worker operation');
    const payload = this.authorizedPayload(operation, workerId, body);
    const { data, error } = await this.supabaseService
      .getClient()
      .rpc(operation, payload);
    if (error) throw new InternalServerErrorException('Worker RPC failed');
    return data;
  }

  private authorizedPayload(
    operation: string,
    workerId: string,
    body: WorkerRpcBody,
  ): WorkerRpcBody {
    const payload = { ...body, p_worker_id: workerId };
    if (operation === 'worker_ping') return { p_worker_id: workerId };
    if (operation === 'claim_next_task') {
      return {
        p_worker_id: workerId,
        p_worker_vram_mb: this.integer(
          body.p_worker_vram_mb,
          'p_worker_vram_mb',
        ),
      };
    }
    if (operation === 'claim_next_resilient_task') {
      const schemes = body.p_supported_input_schemes;
      if (
        !Array.isArray(schemes) ||
        schemes.length < 1 ||
        schemes.length > 2 ||
        schemes.some(
          (scheme) =>
            typeof scheme !== 'string' ||
            !['b2', 'google_drive'].includes(scheme),
        ) ||
        new Set(schemes).size !== schemes.length
      ) {
        throw new BadRequestException(
          'Worker input capability allowlist is invalid',
        );
      }
      return {
        p_worker_id: workerId,
        p_worker_vram_mb: this.integer(
          body.p_worker_vram_mb,
          'p_worker_vram_mb',
        ),
        p_supported_input_schemes: schemes,
      };
    }
    if (operation === 'get_claimed_task_spec') {
      if (
        !Number.isInteger(body.p_task_id) ||
        !Number.isInteger(body.p_generation)
      ) {
        throw new BadRequestException(
          'Worker task and generation are required',
        );
      }
      return {
        p_worker_id: workerId,
        p_task_id: Number(body.p_task_id),
        p_generation: Number(body.p_generation),
      };
    }
    if (operation === 'report_worker_state_transition') {
      if (
        typeof body.p_to_state !== 'string' ||
        !WORKER_STATES.has(body.p_to_state)
      ) {
        throw new BadRequestException('Worker state is invalid');
      }
      const transition: WorkerRpcBody = {
        p_worker_id: workerId,
        p_to_state: body.p_to_state,
      };
      if (body.p_task_id !== undefined && body.p_task_id !== null) {
        if (!Number.isInteger(body.p_task_id) || Number(body.p_task_id) <= 0) {
          throw new BadRequestException('Worker task is invalid');
        }
        transition.p_task_id = Number(body.p_task_id);
      }
      if (body.p_reason !== undefined) {
        if (typeof body.p_reason !== 'string' || body.p_reason.length > 240) {
          throw new BadRequestException('Worker state reason is invalid');
        }
        transition.p_reason = body.p_reason;
      }
      return transition;
    }
    if (operation === 'report_worker_probe') {
      if (
        typeof body.p_probe_state !== 'string' ||
        !PROBE_STATES.has(body.p_probe_state)
      ) {
        throw new BadRequestException('Worker probe state is invalid');
      }
      if (
        body.p_reason !== undefined &&
        (typeof body.p_reason !== 'string' || body.p_reason.length > 240)
      ) {
        throw new BadRequestException('Worker probe reason is invalid');
      }
      const probe: WorkerRpcBody = {
        p_worker_id: workerId,
        p_probe_state: body.p_probe_state,
      };
      if (body.p_reason !== undefined) probe.p_reason = body.p_reason;
      return probe;
    }
    if (operation === 'report_worker_failure') {
      if (
        !Number.isInteger(body.p_task_id) ||
        !Number.isInteger(body.p_generation)
      ) {
        throw new BadRequestException(
          'Worker task and generation are required',
        );
      }
      if (
        typeof body.p_failure_category !== 'string' ||
        !FAILURE_CATEGORIES.has(body.p_failure_category)
      ) {
        throw new BadRequestException('Worker failure category is invalid');
      }
      if (
        body.p_summary !== undefined &&
        (typeof body.p_summary !== 'string' || body.p_summary.length > 500)
      ) {
        throw new BadRequestException('Worker failure summary is invalid');
      }
      const failure: WorkerRpcBody = {
        p_worker_id: workerId,
        p_task_id: Number(body.p_task_id),
        p_generation: Number(body.p_generation),
        p_failure_category: body.p_failure_category,
      };
      if (body.p_summary !== undefined) failure.p_summary = body.p_summary;
      return failure;
    }
    if (
      !Number.isInteger(body.p_task_id) ||
      !Number.isInteger(body.p_generation)
    ) {
      throw new BadRequestException('Worker task and generation are required');
    }
    if (operation === 'fail_task' && typeof body.p_error_type !== 'string') {
      throw new BadRequestException('Worker error type is required');
    }
    return payload;
  }

  private integer(value: unknown, field: string): number {
    if (!Number.isInteger(value) || Number(value) < 0) {
      throw new BadRequestException(`${field} must be a non-negative integer`);
    }
    return Number(value);
  }
}
