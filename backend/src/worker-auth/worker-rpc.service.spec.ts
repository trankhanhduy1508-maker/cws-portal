import { BadRequestException } from '@nestjs/common';
import { WorkerRpcService } from './worker-rpc.service';

describe('WorkerRpcService', () => {
  it('overwrites caller worker_id with authenticated identity', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const service = new WorkerRpcService({ getClient: () => ({ rpc }) } as never);
    await service.call('worker_ping', 'worker-authenticated', { p_worker_id: 'worker-attacker' });
    expect(rpc).toHaveBeenCalledWith('worker_ping', { p_worker_id: 'worker-authenticated' });
  });

  it('rejects arbitrary function names', async () => {
    const rpc = jest.fn();
    const service = new WorkerRpcService({ getClient: () => ({ rpc }) } as never);
    await expect(service.call('drop_everything', 'worker-a', {})).rejects.toBeInstanceOf(BadRequestException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects malformed task/generation payloads', async () => {
    const service = new WorkerRpcService({ getClient: () => ({ rpc: jest.fn() }) } as never);
    await expect(service.call('complete_task', 'worker-a', { p_task_id: '1', p_generation: 2 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
