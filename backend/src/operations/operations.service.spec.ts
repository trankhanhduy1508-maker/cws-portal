import { OperationsService } from './operations.service';

describe('OperationsService', () => {
  it('fails closed when the canonical order query fails', async () => {
    const request = {
      ilike: jest.fn(), eq: jest.fn(), order: jest.fn(), range: jest.fn(),
    };
    request.order.mockReturnValue(request);
    request.range.mockResolvedValue({ data: null, count: null, error: { message: 'database unavailable' } });
    const client = { from: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue(request) }) };
    const service = new OperationsService({ getClient: () => client } as never);
    await expect(service.list({ page: 1, pageSize: 25, search: '', jobStatus: undefined, paymentStatus: undefined }))
      .rejects.toThrow('database unavailable');
  });
});
