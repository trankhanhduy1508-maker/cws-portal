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
]);

const WORKER_STATES = new Set([
  'ACTIVE_IDLE',
  'PREPARING',
  'RENDERING',
  'RECOVERY',
  'CLEANUP',
]);

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
      return {
        p_worker_id: workerId,
        p_worker_vram_mb: this.integer(
          body.p_worker_vram_mb,
          'p_worker_vram_mb',
        ),
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
