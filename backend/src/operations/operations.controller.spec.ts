import { OperationsController } from './operations.controller';

describe('OperationsController', () => {
  const operations = {
    overview: jest.fn(), list: jest.fn(), detail: jest.fn(), timeline: jest.fn(),
  };
  const controller = new OperationsController(operations as never);

  beforeEach(() => jest.clearAllMocks());

  it('passes a validated, bounded query to the service', async () => {
    operations.list.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    await controller.list({ search: ' demo ', jobStatus: 'queued' });
    expect(operations.list).toHaveBeenCalledWith(expect.objectContaining({
      page: 1, pageSize: 25, search: 'demo', jobStatus: 'queued',
    }));
  });

  it('delegates detail and timeline without exposing a browser database path', async () => {
    operations.detail.mockResolvedValue({ orderId: 'order-1' });
    operations.timeline.mockResolvedValue([]);
    await expect(controller.detail('order-1')).resolves.toEqual({ orderId: 'order-1' });
    await expect(controller.timeline('order-1')).resolves.toEqual([]);
  });
});
