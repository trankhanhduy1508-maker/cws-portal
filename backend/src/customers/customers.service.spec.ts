import { CustomersService } from './customers.service';

describe('CustomersService CRM', () => {
  it('returns repository CRM summaries without changing customer/payment data', async () => {
    const repository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllCrmSummaries: jest.fn().mockResolvedValue([
        {
          id: 'customer-1',
          email: 'customer@example.com',
          fullName: 'Customer One',
          registeredAt: 1,
          lastActiveAt: 2,
          totalJobs: 2,
          completedJobs: 1,
          totalPaidVnd: 150000,
          latestJob: { id: 'job-2', status: 'rendering', createdAt: 2 },
          lifecycleStatus: 'returning',
        },
      ]),
    };
    const service = new CustomersService(repository);

    await expect(service.listCrmSummaries()).resolves.toEqual([
      expect.objectContaining({
        email: 'customer@example.com',
        totalJobs: 2,
        completedJobs: 1,
        totalPaidVnd: 150000,
      }),
    ]);
    expect(repository.findAllCrmSummaries).toHaveBeenCalledTimes(1);
  });
});
