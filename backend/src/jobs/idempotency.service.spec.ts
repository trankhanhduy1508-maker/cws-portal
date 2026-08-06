import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobStatus } from './domain/job-status.enum';
import { RenderProfileId } from './domain/render-profile';

describe('JobsService.createOrder idempotency', () => {
  function make() {
    const orders = new Map<string, any>();
    const repository = {
      findActiveOrders: jest.fn().mockResolvedValue([]),
      findByIdempotencyKey: jest.fn(async (key: string) =>
        [...orders.values()].find((order) => order.idempotencyKey === key) ?? null,
      ),
      create: jest.fn(async (order: any) => {
        if ([...orders.values()].some((item) => item.idempotencyKey === order.idempotencyKey)) {
          throw new Error('unique violation');
        }
        orders.set(order.id, order);
        return order;
      }),
      attachInternalJobId: jest.fn(async (id: string, internalJobId: string) => {
        orders.get(id).internalJobId = internalJobId;
      }),
    };
    const gateway = {
      countOnlineWorkers: jest.fn().mockResolvedValue(1),
      createInternalJobWithProbeTask: jest.fn(async ({ internalJobId }: { internalJobId: string }) => internalJobId),
    };
    const service = new JobsService(
      repository as never, gateway as never, {} as never, {} as never,
      {} as never, {} as never, {} as never,
    );
    return { service, repository, orders };
  }

  const dto = {
    fileRef: 'staging/input.blend', fileName: 'input.blend',
    fileSizeBytes: 1024, profileId: RenderProfileId.STANDARD,
  };

  it('returns the original job for a retry with the same key', async () => {
    const { service, repository } = make();
    const first = await service.createOrder(dto, null, 'retry-key-0000001');
    const second = await service.createOrder(dto, null, 'retry-key-0000001');
    expect(second).toEqual(first);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('rejects reusing a key with a different request payload', async () => {
    const { service } = make();
    await service.createOrder(dto, null, 'retry-key-0000002');
    await expect(service.createOrder({ ...dto, fileName: 'other.blend' }, null, 'retry-key-0000002'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a bounded safe idempotency key', async () => {
    const { service } = make();
    await expect(service.createOrder(dto, null, undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createOrder(dto, null, 'short')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the raced durable row after a unique insert conflict', async () => {
    const { service, repository, orders } = make();
    repository.create = jest.fn(async (order: any) => {
      orders.set('raced-job', { ...order, id: 'raced-job', status: JobStatus.SEARCHING_WORKERS });
      throw new Error('unique violation');
    });
    await expect(service.createOrder(dto, null, 'retry-key-0000003')).resolves.toEqual({ jobId: 'raced-job' });
  });
});
