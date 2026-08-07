import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { WorkerFleetGateway } from '../worker-fleet.gateway';

const WORKER_STARTUP_SECONDS = 10 * 60;

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

  it('không có execution runtime -> từ chối tính giá thay vì dùng fallback', async () => {
    mockGateway.getTaskExecutionDetails.mockResolvedValue([]);

    await expect(service.computeFinalPriceVnd('job-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
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
  });

  it('task chưa có heartbeat runtime -> từ chối tính giá', async () => {
    mockGateway.getTaskExecutionDetails.mockResolvedValue([
      {
        workerId: 'W1',
        claimedAt: '2026-07-31T00:00:00.000Z',
        lastHeartbeat: null,
      },
    ]);

    await expect(service.computeFinalPriceVnd('job-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('áp dụng đúng giá host 6.000 VND/worker-hour nhân 2.5', async () => {
    mockGateway.getTaskExecutionDetails.mockResolvedValue([
      {
        workerId: 'W1',
        claimedAt: '2026-07-31T00:00:00.000Z',
        lastHeartbeat: '2026-07-31T01:00:00.000Z',
      },
    ]);

    const result = await service.computeFinalPriceVnd('job-1');

    expect(result.finalPriceVnd).toBe(((3600 + WORKER_STARTUP_SECONDS) / 3600) * 6000 * 2.5);
  });
});
