import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { RENDER_ORDERS_REPOSITORY } from './repositories/render-orders.repository.interface';
import { WorkerFleetGateway } from './worker-fleet.gateway';
import { PACKAGING_SERVICE } from './services/packaging.interface';
import { StorageService } from '../storage/storage.service';
import { B2StorageService } from '../files/b2-storage.service';
import { RenderProfileId } from './domain/render-profile';

describe('JobsService.estimate()', () => {
  let service: JobsService;
  let mockRepository: { findActiveOrders: jest.Mock };
  let mockGateway: { countOnlineWorkers: jest.Mock };

  beforeEach(async () => {
    mockRepository = { findActiveOrders: jest.fn().mockResolvedValue([]) };
    mockGateway = { countOnlineWorkers: jest.fn().mockResolvedValue(1) }; // giả định có worker online -> queueSeconds = 0

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: RENDER_ORDERS_REPOSITORY, useValue: mockRepository },
        { provide: WorkerFleetGateway, useValue: mockGateway },
        { provide: PACKAGING_SERVICE, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: B2StorageService, useValue: {} },
      ],
    }).compile();

    service = module.get(JobsService);
  });

  it('Turbo phải nhanh hơn và đắt hơn Standard', async () => {
    const standard = await service.estimate({
      fileSizeBytes: 100 * 1024 * 1024,
      profileId: RenderProfileId.STANDARD,
    });
    const turbo = await service.estimate({
      fileSizeBytes: 100 * 1024 * 1024,
      profileId: RenderProfileId.TURBO,
    });

    expect(turbo.etaSeconds).toBeLessThan(standard.etaSeconds);
    expect(turbo.costVnd).toBeGreaterThan(standard.costVnd);
  });

  it('Economy phải chậm hơn và rẻ hơn Standard', async () => {
    const standard = await service.estimate({
      fileSizeBytes: 100 * 1024 * 1024,
      profileId: RenderProfileId.STANDARD,
    });
    const economy = await service.estimate({
      fileSizeBytes: 100 * 1024 * 1024,
      profileId: RenderProfileId.ECONOMY,
    });

    expect(economy.etaSeconds).toBeGreaterThan(standard.etaSeconds);
    expect(economy.costVnd).toBeLessThan(standard.costVnd);
  });

  it('không có Worker online -> queueSeconds phải > 0 nếu có order đang active', async () => {
    mockGateway.countOnlineWorkers.mockResolvedValue(0);
    mockRepository.findActiveOrders.mockResolvedValue([{}, {}, {}]); // 3 order đang chờ

    const result = await service.estimate({
      fileSizeBytes: 50 * 1024 * 1024,
      profileId: RenderProfileId.STANDARD,
    });

    expect(result.queueSeconds).toBeGreaterThan(0);
  });

  it('có Worker online -> queueSeconds phải = 0 dù có order khác đang active', async () => {
    mockGateway.countOnlineWorkers.mockResolvedValue(2);
    mockRepository.findActiveOrders.mockResolvedValue([{}, {}, {}]);

    const result = await service.estimate({
      fileSizeBytes: 50 * 1024 * 1024,
      profileId: RenderProfileId.STANDARD,
    });

    expect(result.queueSeconds).toBe(0);
  });
});
