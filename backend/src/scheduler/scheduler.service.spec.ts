import { SchedulerService } from './scheduler.service';
import { JobStatus } from '../jobs/domain/job-status.enum';

function order(status: JobStatus = JobStatus.QUEUED) {
  return {
    id: 'order-1', projectName: 'Test', software: null, softwareVersion: null, notes: null,
    storageCode: 'CWS-TEST', customerId: 'customer-1', profileId: 'standard', status,
    stageProgress: 0, paymentId: null, paymentStatus: 'unpaid',
    estimate: { etaSeconds: 0, costVnd: 1000, queueSeconds: 0 }, finalPriceVnd: null,
    workerRuntimeSeconds: null, driveLink: null, uploadedFileB2Key: null, fileSizeBytes: null,
    internalJobId: 'internal-1', createdAt: Date.now(), downloadUrl: null, durationSec: null,
    resultSizeBytes: null, isPlaceholder: false,
  } as any;
}

function makeService() {
  const ordersRepository = { findActiveOrders: jest.fn(), updateStatus: jest.fn().mockResolvedValue(undefined) };
  const workerFleetGateway = {
    getTasks: jest.fn(), countOnlineWorkers: jest.fn(), getTotalFrames: jest.fn(),
    createRemainingTasks: jest.fn(),
  };
  const jobsService = { finalizeDelivery: jest.fn() };
  const previewService = { generateReviewPreview: jest.fn().mockResolvedValue(undefined) };
  const storageService = { notify: jest.fn().mockResolvedValue(undefined), logWorkerEvent: jest.fn() };
  const wakeService = { tryWakeAnyCandidate: jest.fn().mockResolvedValue({ attempted: false, success: false }) };
  const service = new SchedulerService(
    ordersRepository as any, workerFleetGateway as any, jobsService as any,
    previewService as any, storageService as any, wakeService as any,
  );
  return { service, ordersRepository, workerFleetGateway, jobsService, previewService, storageService };
}

describe('SchedulerService MVP state transitions', () => {
  it('does not report rendering until a Worker task is active', async () => {
    const { service, workerFleetGateway, ordersRepository } = makeService();
    workerFleetGateway.getTasks.mockResolvedValue([{ status: 'queued' }]);
    workerFleetGateway.countOnlineWorkers.mockResolvedValue(1);
    await (service as any).processOrder(order());
    expect(ordersRepository.updateStatus).toHaveBeenCalledWith('order-1', JobStatus.ALLOCATING_WORKERS, 0);
  });

  it('maps active task progress to rendering', async () => {
    const { service, workerFleetGateway, ordersRepository } = makeService();
    workerFleetGateway.getTasks.mockResolvedValue([{ status: 'done' }, { status: 'active' }]);
    workerFleetGateway.countOnlineWorkers.mockResolvedValue(1);
    await (service as any).processOrder(order());
    expect(ordersRepository.updateStatus).toHaveBeenCalledWith('order-1', JobStatus.RENDERING, 0.5);
  });

  it('moves all-done work to preview/review_ready, never directly to payment', async () => {
    const { service, workerFleetGateway, ordersRepository, previewService } = makeService();
    workerFleetGateway.getTasks.mockResolvedValue([{ status: 'done' }]);
    workerFleetGateway.getTotalFrames.mockResolvedValue(1);
    workerFleetGateway.countOnlineWorkers.mockResolvedValue(1);
    await (service as any).processOrder(order());
    expect(previewService.generateReviewPreview).toHaveBeenCalledWith('internal-1', 'order-1');
    expect(ordersRepository.updateStatus).toHaveBeenCalledWith('order-1', JobStatus.REVIEW_READY, 1);
  });

  it('finalizes only an already awaiting-payment order', async () => {
    const { service, jobsService, workerFleetGateway, storageService } = makeService();
    jobsService.finalizeDelivery.mockResolvedValue(order(JobStatus.FINISHED));
    await (service as any).processOrder(order(JobStatus.AWAITING_PAYMENT));
    expect(jobsService.finalizeDelivery).toHaveBeenCalledWith('order-1');
    expect(workerFleetGateway.getTasks).not.toHaveBeenCalled();
    expect(storageService.notify).toHaveBeenCalled();
  });
});
