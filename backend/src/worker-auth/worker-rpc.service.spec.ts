import { BadRequestException } from '@nestjs/common';
import { WorkerRpcService } from './worker-rpc.service';

describe('WorkerRpcService', () => {
  it('overwrites caller worker_id with authenticated identity', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const service = new WorkerRpcService({
      getClient: () => ({ rpc }),
    } as never);
    await service.call('worker_ping', 'worker-authenticated', {
      p_worker_id: 'worker-attacker',
    });
    expect(rpc).toHaveBeenCalledWith('worker_ping', {
      p_worker_id: 'worker-authenticated',
    });
  });

  it('rejects arbitrary function names', async () => {
    const rpc = jest.fn();
    const service = new WorkerRpcService({
      getClient: () => ({ rpc }),
    } as never);
    await expect(
      service.call('drop_everything', 'worker-a', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('does not expose self-registration through the production Worker gateway', async () => {
    const rpc = jest.fn();
    const service = new WorkerRpcService({
      getClient: () => ({ rpc }),
    } as never);
    await expect(
      service.call('register_worker', 'worker-a', {
        p_fleet_id: 1,
        p_vram_mb: 999999,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects malformed task/generation payloads', async () => {
    const service = new WorkerRpcService({
      getClient: () => ({ rpc: jest.fn() }),
    } as never);
    await expect(
      service.call('complete_task', 'worker-a', {
        p_task_id: '1',
        p_generation: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('authorizes the resilient failover claim with the authenticated worker id', async () => {
    const supabase = {
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    const service = new WorkerRpcService({ getClient: () => supabase } as any);
    await service.call('claim_next_resilient_task', 'worker-a', {
      p_worker_id: 'attacker',
      p_worker_vram_mb: 4096,
      p_supported_input_schemes: ['b2'],
    });
    expect(supabase.rpc).toHaveBeenCalledWith('claim_next_resilient_task', {
      p_worker_id: 'worker-a',
      p_worker_vram_mb: 4096,
      p_supported_input_schemes: ['b2'],
    });
  });

  it('rejects missing, duplicate, or unknown input capabilities', async () => {
    const service = new WorkerRpcService({
      getClient: () => ({ rpc: jest.fn() }),
    } as never);
    await expect(
      service.call('claim_next_resilient_task', 'worker-a', {
        p_worker_vram_mb: 4096,
      }),
    ).rejects.toThrow('input capability allowlist is invalid');
    await expect(
      service.call('claim_next_resilient_task', 'worker-a', {
        p_worker_vram_mb: 4096,
        p_supported_input_schemes: ['b2', 'b2'],
      }),
    ).rejects.toThrow('input capability allowlist is invalid');
    await expect(
      service.call('claim_next_resilient_task', 'worker-a', {
        p_worker_vram_mb: 4096,
        p_supported_input_schemes: ['https'],
      }),
    ).rejects.toThrow('input capability allowlist is invalid');
  });

  it('reads a claimed JobSpec only with the authenticated worker identity', async () => {
    const supabase = {
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    const service = new WorkerRpcService({ getClient: () => supabase } as any);
    await service.call('get_claimed_task_spec', 'worker-a', {
      p_worker_id: 'attacker',
      p_task_id: 42,
      p_generation: 7,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('get_claimed_task_spec', {
      p_worker_id: 'worker-a',
      p_task_id: 42,
      p_generation: 7,
    });
  });

  it('allows an authenticated idle transition without a task or generation', async () => {
    const supabase = {
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    };
    const service = new WorkerRpcService({ getClient: () => supabase } as any);
    await service.call('report_worker_state_transition', 'worker-a', {
      p_worker_id: 'attacker',
      p_to_state: 'ACTIVE_IDLE',
    });
    expect(supabase.rpc).toHaveBeenCalledWith(
      'report_worker_state_transition',
      {
        p_worker_id: 'worker-a',
        p_to_state: 'ACTIVE_IDLE',
      },
    );
  });

  it('rejects forged or unknown Worker state transition fields', async () => {
    const supabase = { rpc: jest.fn() };
    const service = new WorkerRpcService({ getClient: () => supabase } as any);
    await expect(
      service.call('report_worker_state_transition', 'worker-a', {
        p_to_state: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.call('report_worker_state_transition', 'worker-a', {
        p_to_state: 'RENDERING',
        p_task_id: '42',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('validates taxonomy and binds fenced failure reports to the authenticated Worker', async () => {
    const supabase = {
      rpc: jest.fn().mockResolvedValue({ data: 'requeued', error: null }),
    };
    const service = new WorkerRpcService({ getClient: () => supabase } as any);
    await service.call('report_worker_failure', 'worker-a', {
      p_worker_id: 'attacker',
      p_task_id: 42,
      p_generation: 7,
      p_failure_category: 'STORAGE_TRANSIENT',
      p_summary: 'temporary storage timeout',
    });
    expect(supabase.rpc).toHaveBeenCalledWith('report_worker_failure', {
      p_worker_id: 'worker-a',
      p_task_id: 42,
      p_generation: 7,
      p_failure_category: 'STORAGE_TRANSIENT',
      p_summary: 'temporary storage timeout',
    });
    await expect(
      service.call('report_worker_failure', 'worker-a', {
        p_task_id: 42,
        p_generation: 7,
        p_failure_category: 'WORKER_HOST_ERROR\nSQL',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates the authenticated probe lifecycle', async () => {
    const supabase = {
      rpc: jest.fn().mockResolvedValue({ data: 'probing', error: null }),
    };
    const service = new WorkerRpcService({ getClient: () => supabase } as any);
    await service.call('report_worker_probe', 'worker-a', {
      p_worker_id: 'attacker',
      p_probe_state: 'PROBING',
      p_reason: 'startup',
    });
    expect(supabase.rpc).toHaveBeenCalledWith('report_worker_probe', {
      p_worker_id: 'worker-a',
      p_probe_state: 'PROBING',
      p_reason: 'startup',
    });
    await expect(
      service.call('report_worker_probe', 'worker-a', {
        p_probe_state: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
