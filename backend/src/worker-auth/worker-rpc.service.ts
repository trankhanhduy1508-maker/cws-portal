import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type WorkerRpcBody = Record<string, unknown>;

const RPC_NAMES = new Set([
  'register_worker',
  'worker_ping',
  'claim_next_task',
  'claim_next_resilient_task',
  'report_heartbeat',
  'complete_task',
  'fail_task',
  'update_task_stage',
  'report_worker_state_transition',
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
    if (operation === 'register_worker') {
      return {
        p_worker_id: workerId,
        p_fleet_id: this.integer(body.p_fleet_id, 'p_fleet_id'),
        p_gpu_name:
          typeof body.p_gpu_name === 'string'
            ? body.p_gpu_name.slice(0, 200)
            : null,
        p_vram_mb: this.integer(body.p_vram_mb, 'p_vram_mb'),
      };
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
