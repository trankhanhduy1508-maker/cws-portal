import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { RENDER_ORDERS_REPOSITORY } from './repositories/render-orders.repository.interface';
import { WorkerFleetGateway } from './worker-fleet.gateway';
import { PACKAGING_SERVICE } from './services/packaging.interface';
import { StorageService } from '../storage/storage.service';
import { B2StorageService } from '../files/b2-storage.service';
import { PaymentsService } from '../payments/payments.service';
import { RenderProfileId } from './domain/render-profile';
import { JobStatus } from './domain/job-status.enum';
import { RenderOrder } from './domain/render-order';
import { PaymentStatus } from '../payments/payment.types';
import { PricingService } from './services/pricing.service';

describe('JobsService.estimate()', () => {
  let service: JobsService;
  let mockRepository: { findActiveOrders: jest.Mock };
  let mockGateway: { countOnlineWorkers: jest.Mock };
  let mockPaymentsService: { getStatus: jest.Mock };

  beforeEach(async () => {
    mockRepository = { findActiveOrders: jest.fn().mockResolvedValue([]) };
    mockGateway = { countOnlineWorkers: jest.fn().mockResolvedValue(1) }; // giả định có worker online -> queueSeconds = 0
    mockPaymentsService = { getStatus: jest.fn().mockResolvedValue('paid') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: RENDER_ORDERS_REPOSITORY, useValue: mockRepository },
        { provide: WorkerFleetGateway, useValue: mockGateway },
        { provide: PACKAGING_SERVICE, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: B2StorageService, useValue: {} },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: PricingService, useValue: {} },
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

/**
 * Test cho sửa mismatch nghiêm trọng nhất (audit 2026-07-30): thanh
 * toán phải diễn ra SAU khi khách duyệt preview, không phải trước khi
 * tạo job (CWS_MVP_WORKFLOW_FINAL.md). approve() sinh payment;
 * finalizeDelivery() chỉ đóng gói khi payment thật sự PAID.
 */
describe('JobsService.approve() / finalizeDelivery()', () => {
  let service: JobsService;
  let mockRepository: {
    findById: jest.Mock;
    attachPayment: jest.Mock;
    markPaymentPaid: jest.Mock;
    updateStatus: jest.Mock;
    updateResult: jest.Mock;
  };
  let mockGateway: { getJobMeta: jest.Mock };
  let mockPackagingService: { packageRenderResult: jest.Mock };
  let mockPaymentsService: { createIntent: jest.Mock; getStatus: jest.Mock };
  let mockPricingService: { computeFinalPriceVnd: jest.Mock };

  function baseOrder(overrides: Partial<RenderOrder> = {}): RenderOrder {
    return {
      id: 'job-1',
      projectName: 'scene.blend',
      software: null,
      softwareVersion: null,
      notes: null,
      storageCode: 'CWS-AAAAAAAA',
      customerId: null,
      profileId: RenderProfileId.STANDARD,
      status: JobStatus.REVIEW_READY,
      stageProgress: 1,
      paymentId: null,
      paymentStatus: 'unpaid',
      estimate: { etaSeconds: 900, costVnd: 45000, queueSeconds: 0 },
      finalPriceVnd: null,
      workerRuntimeSeconds: null,
      driveLink: 'https://drive.google.com/file/d/abc',
      uploadedFileB2Key: null,
      fileSizeBytes: 1000,
      internalJobId: 'internal-1',
      createdAt: Date.now(),
      downloadUrl: null,
      durationSec: null,
      resultSizeBytes: null,
      isPlaceholder: false,
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      attachPayment: jest.fn(),
      markPaymentPaid: jest.fn().mockResolvedValue(undefined),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      updateResult: jest.fn(),
    };
    mockGateway = {
      getJobMeta: jest.fn().mockResolvedValue({ totalFrames: 48, fps: 24 }),
    };
    mockPackagingService = {
      packageRenderResult: jest.fn().mockResolvedValue({ downloadUrl: 'https://b2/final.zip', resultSizeBytes: 123 }),
    };
    mockPaymentsService = {
      createIntent: jest.fn().mockResolvedValue({
        paymentId: 'pay-1',
        paymentCode: 'AB12CD34',
        transferContent: 'CWS CWS-AAAAAAAA AB12CD34',
        qrImageUrl: null,
      }),
      getStatus: jest.fn(),
    };
    mockPricingService = {
      computeFinalPriceVnd: jest.fn().mockResolvedValue({ finalPriceVnd: 72000, workerRuntimeSeconds: 2100 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: RENDER_ORDERS_REPOSITORY, useValue: mockRepository },
        { provide: WorkerFleetGateway, useValue: mockGateway },
        { provide: PACKAGING_SERVICE, useValue: mockPackagingService },
        { provide: StorageService, useValue: {} },
        { provide: B2StorageService, useValue: {} },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: PricingService, useValue: mockPricingService },
      ],
    }).compile();

    service = module.get(JobsService);
  });

  it('approve() ném lỗi nếu job chưa ở review_ready', async () => {
    mockRepository.findById.mockResolvedValue(baseOrder({ status: JobStatus.RENDERING }));

    await expect(service.approve('job-1')).rejects.toThrow(BadRequestException);
    expect(mockPricingService.computeFinalPriceVnd).not.toHaveBeenCalled();
    expect(mockPaymentsService.createIntent).not.toHaveBeenCalled();
  });

  it('approve() sinh payment với giá THẬT (PricingService), KHÔNG dùng estimate.costVnd', async () => {
    const order = baseOrder();
    mockRepository.findById.mockResolvedValue(order);
    mockRepository.attachPayment.mockResolvedValue(baseOrder({ status: JobStatus.AWAITING_PAYMENT, paymentId: 'pay-1' }));

    const result = await service.approve('job-1');

    expect(mockPricingService.computeFinalPriceVnd).toHaveBeenCalledWith('internal-1');
    expect(mockPaymentsService.createIntent).toHaveBeenCalledWith(
      { amountVnd: 72000, method: 'qr_bank' }, // giá THẬT (72000), khác estimate.costVnd (45000)
      { jobId: 'job-1', storageCode: 'CWS-AAAAAAAA' },
    );
    expect(mockRepository.attachPayment).toHaveBeenCalledWith('job-1', 'pay-1', 72000, 2100);
    expect(result.order.status).toBe(JobStatus.AWAITING_PAYMENT);
    expect(result.payment.paymentId).toBe('pay-1');
    expect(result.payment.amountVnd).toBe(72000);
    expect(result.payment.transferContent).toBe('CWS CWS-AAAAAAAA AB12CD34');
  });

  it('finalizeDelivery() trả về null (KHÔNG throw) nếu job chưa ở awaiting_payment', async () => {
    mockRepository.findById.mockResolvedValue(baseOrder({ status: JobStatus.RENDERING }));

    const result = await service.finalizeDelivery('job-1');

    expect(result).toBeNull();
    expect(mockPackagingService.packageRenderResult).not.toHaveBeenCalled();
  });

  it('finalizeDelivery() trả về null nếu payment CHƯA PAID — không đóng gói sớm', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({ status: JobStatus.AWAITING_PAYMENT, paymentId: 'pay-1' }),
    );
    mockPaymentsService.getStatus.mockResolvedValue(PaymentStatus.PROCESSING);

    const result = await service.finalizeDelivery('job-1');

    expect(result).toBeNull();
    expect(mockPackagingService.packageRenderResult).not.toHaveBeenCalled();
  });

  it('finalizeDelivery() đóng gói + mở tải khi payment đã PAID, dùng fps thật từ Worker', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({ status: JobStatus.AWAITING_PAYMENT, paymentId: 'pay-1' }),
    );
    mockPaymentsService.getStatus.mockResolvedValue(PaymentStatus.PAID);
    mockGateway.getJobMeta.mockResolvedValue({ totalFrames: 48, fps: 30 });
    mockRepository.updateResult.mockResolvedValue(
      baseOrder({ status: JobStatus.FINISHED, downloadUrl: 'https://b2/final.zip' }),
    );

    const result = await service.finalizeDelivery('job-1');

    expect(mockRepository.markPaymentPaid).toHaveBeenCalledWith('job-1');
    expect(mockGateway.getJobMeta).toHaveBeenCalledWith('internal-1');
    expect(mockPackagingService.packageRenderResult).toHaveBeenCalledWith('internal-1', 'job-1', 30);
    expect(result?.status).toBe(JobStatus.FINISHED);
    expect(result?.downloadUrl).toBe('https://b2/final.zip');
  });
});
