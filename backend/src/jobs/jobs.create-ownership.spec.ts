import { JobsController } from './jobs.controller';

describe('JobsController.create upload ownership', () => {
  it('verifies the upload belongs to the authenticated customer before dispatch', async () => {
    const jobsService = {
      createOrder: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
    };
    const supabaseService = {
      getClient: () => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'customer-1' } },
            error: null,
          }),
        },
      }),
    };
    const inputUploadsService = {
      assertOwned: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new JobsController(
      jobsService as never,
      supabaseService as never,
      inputUploadsService as never,
    );

    await controller.create(
      {
        fileRef: 'uploads/input.blend',
        fileName: 'input.blend',
        profileId: 'balanced',
      } as never,
      {
        headers: { authorization: 'Bearer customer-token' },
        query: {},
        header: (name: string) =>
          name === 'Idempotency-Key' ? 'customer-retry-key-0001' : undefined,
      } as never,
    );

    expect(inputUploadsService.assertOwned).toHaveBeenCalledWith(
      'uploads/input.blend',
      'customer-1',
    );
    expect(jobsService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ fileRef: 'uploads/input.blend' }),
      'customer-1',
      'customer-retry-key-0001',
    );
  });
});
