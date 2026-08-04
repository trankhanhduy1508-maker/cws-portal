import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { WorkerFleetGateway } from '../worker-fleet.gateway';

const VND_PER_WORKER_HOUR = 6000;
const FINAL_PRICE_MULTIPLIER = 2;
const WORKER_STARTUP_SECONDS = 10 * 60;

function priceFromSeconds(totalSeconds: number): number {
  return Math.round(
    (totalSeconds / 3600) * VND_PER_WORKER_HOUR * FINAL_PRICE_MULTIPLIER,
  );
}

describe('PricingService.computeFinalPriceVnd()', () => {
  let service: PricingService;
  let mockGateway: { getTaskExecutionDetails: jest.Mock };

  beforeEach(async () => {
    mockGateway = { getTaskExecutionDetails: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: WorkerFleetGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get(PricingService);
  });

  it('không có dữ liệu execution nào -> tính tối thiểu 1 Worker x thời gian khởi động', async () => {
    mockGateway.getTaskExecutionDetails.mockResolvedValue([]);

    const result = await service.computeFinalPriceVnd('job-1');

    expect(result.workerRuntimeSeconds).toBe(WORKER_STARTUP_SECONDS);
    expect(result.finalPriceVnd).toBe(priceFromSeconds(WORKER_STARTUP_SECONDS));
    expect(result.workerCount).toBe(1);
  });

  it('1 worker, 1 task -> runtime task + 1 lần khởi động', async () => {
    mockGateway.getTaskExecutionDetails.mockResolvedValue([
      {
        workerId: 'W1',
        claimedAt: '2026-07-31T00:00:00.000Z',
        lastHeartbeat: '2026-07-31T00:05:00.000Z', // 300s runtime
      },
    ]);

    const result = await service.computeFinalPriceVnd('job-1');

    expect(result.workerRuntimeSeconds).toBe(300 + WORKER_STARTUP_SECONDS);
    expect(result.workerCount).toBe(1);
  });

  it('CÙNG 1 worker nhận 2 task KHÔNG LIÊN TỤC của cùng job -> KHÔNG được tính thời gian rảnh giữa 2 lần là runtime (bug đã sửa)', async () => {
    // Task 1: claim luc 00:00, xong luc 00:05 (300s runtime).
    // Worker RANH tu 00:05 den 02:00 (khong lam gi cho job nay).
    // Task 2: claim lai luc 02:00, xong luc 02:02 (120s runtime).
    // Truoc khi sua: se tinh khoang [00:00, 02:02] = 7320s runtime (SAI,
    // tinh ca 1h55p worker ranh la thoi gian lam viec that).
    // Sau khi sua: CHI cong dong 300s + 120s = 420s runtime that su.
    mockGateway.getTaskExecutionDetails.mockResolvedValue([
      {
        workerId: 'W1',
        claimedAt: '2026-07-31T00:00:00.000Z',
        lastHeartbeat: '2026-07-31T00:05:00.000Z',
      },
      {
        workerId: 'W1',
        claimedAt: '2026-07-31T02:00:00.000Z',
        lastHeartbeat: '2026-07-31T02:02:00.000Z',
      },
    ]);

    const result = await service.computeFinalPriceVnd('job-1');

    // 300s + 120s = 420s task runtime, CHI 1 lan khoi dong (cung 1 worker).
    expect(result.workerRuntimeSeconds).toBe(420 + WORKER_STARTUP_SECONDS);
    expect(result.workerCount).toBe(1);
  });

  it('2 worker khac nhau -> cong dong runtime tung worker + khoi dong RIENG cho MOI worker', async () => {
    mockGateway.getTaskExecutionDetails.mockResolvedValue([
      {
        workerId: 'W1',
        claimedAt: '2026-07-31T00:00:00.000Z',
        lastHeartbeat: '2026-07-31T00:05:00.000Z',
      }, // 300s
      {
        workerId: 'W2',
        claimedAt: '2026-07-31T00:00:00.000Z',
        lastHeartbeat: '2026-07-31T00:10:00.000Z',
      }, // 600s
    ]);

    const result = await service.computeFinalPriceVnd('job-1');

    expect(result.workerRuntimeSeconds).toBe(
      300 + 600 + 2 * WORKER_STARTUP_SECONDS,
    );
    expect(result.workerCount).toBe(2);
  });

  it('task chưa kịp có heartbeat nào (lastHeartbeat null) -> runtime = 0 cho task đó, không bịa số', async () => {
    mockGateway.getTaskExecutionDetails.mockResolvedValue([
      {
        workerId: 'W1',
        claimedAt: '2026-07-31T00:00:00.000Z',
        lastHeartbeat: null,
      },
    ]);

    const result = await service.computeFinalPriceVnd('job-1');

    expect(result.workerRuntimeSeconds).toBe(0 + WORKER_STARTUP_SECONDS);
    expect(result.workerCount).toBe(1);
  });
});
