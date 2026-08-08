import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
 * Render-first contract: full output is locked before payment; approve()
 * remains only as a backwards-compatible payment endpoint. finalizeDelivery()
 * only unlocks an already-uploaded result after a real PAID state.
 */
describe('JobsService.approve() / finalizeDelivery()', () => {
  let service: JobsService;
  let mockRepository: {
    findById: jest.Mock;
    attachPayment: jest.Mock;
    markPaymentPaid: jest.Mock;
    updateStatus: jest.Mock;
    updateResult: jest.Mock;
    unlockResult: jest.Mock;
  };
  let mockGateway: { getJobMeta: jest.Mock; adminCancelJob: jest.Mock };
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
      unlockResult: jest.fn(),
    };
    mockGateway = {
      getJobMeta: jest.fn().mockResolvedValue({ totalFrames: 48, fps: 24 }),
      adminCancelJob: jest.fn().mockResolvedValue(1),
    };
    mockPackagingService = {
      packageRenderResult: jest.fn().mockResolvedValue({
        downloadUrl: 'https://b2/final.zip',
        resultSizeBytes: 123,
      }),
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
      computeFinalPriceVnd: jest.fn().mockResolvedValue({
        finalPriceVnd: 72000,
        workerRuntimeSeconds: 2100,
      }),
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
    mockRepository.findById.mockResolvedValue(
      baseOrder({ status: JobStatus.RENDERING }),
    );

    await expect(service.approve('job-1')).rejects.toThrow(BadRequestException);
    expect(mockPricingService.computeFinalPriceVnd).not.toHaveBeenCalled();
    expect(mockPaymentsService.createIntent).not.toHaveBeenCalled();
  });

  it('approve() không tạo payment lần hai khi job đã chờ thanh toán', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({
        status: JobStatus.AWAITING_PAYMENT,
        paymentId: 'pay-existing',
      }),
    );

    (mockPaymentsService as any).getPublicDetails = jest.fn().mockResolvedValue({
      paymentId: 'pay-existing',
      paymentCode: 'EXISTING1',
      transferContent: 'CWS CWS-AAAAAAAA EXISTING1',
      qrImageUrl: 'https://qr/existing',
      amountVnd: 72000,
    });

    await expect(service.approve('job-1')).resolves.toMatchObject({
      payment: { paymentId: 'pay-existing' },
    });
    expect(mockPricingService.computeFinalPriceVnd).not.toHaveBeenCalled();
    expect(mockPaymentsService.createIntent).not.toHaveBeenCalled();
  });

  it('approve() sinh payment với giá THẬT (PricingService), KHÔNG dùng estimate.costVnd', async () => {
    const order = baseOrder();
    mockRepository.findById.mockResolvedValue(order);
    mockRepository.attachPayment.mockResolvedValue(
      baseOrder({ status: JobStatus.AWAITING_PAYMENT, paymentId: 'pay-1' }),
    );

    const result = await service.approve('job-1');

    expect(mockPricingService.computeFinalPriceVnd).toHaveBeenCalledWith(
      'internal-1',
    );
    expect(mockPaymentsService.createIntent).toHaveBeenCalledWith(
      { amountVnd: 72000, method: 'qr_bank' }, // giá THẬT (72000), khác estimate.costVnd (45000)
      { jobId: 'job-1', storageCode: 'CWS-AAAAAAAA' },
    );
    expect(mockRepository.attachPayment).toHaveBeenCalledWith(
      'job-1',
      'pay-1',
      72000,
      2100,
    );
    expect(result.order.status).toBe(JobStatus.AWAITING_PAYMENT);
    expect(result.payment.paymentId).toBe('pay-1');
    expect(result.payment.amountVnd).toBe(72000);
    expect(result.payment.transferContent).toBe('CWS CWS-AAAAAAAA AB12CD34');
  });

  it('finalizeDelivery() trả về null (KHÔNG throw) nếu job chưa ở awaiting_payment', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({ status: JobStatus.RENDERING }),
    );

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

  it('finalizeDelivery() chỉ mở tải output đã khóa khi payment đã PAID', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({
        status: JobStatus.AWAITING_PAYMENT,
        paymentId: 'pay-1',
        downloadUrl: 'https://b2/final.zip',
        resultSizeBytes: 123,
      }),
    );
    mockPaymentsService.getStatus.mockResolvedValue(PaymentStatus.PAID);
    mockRepository.unlockResult.mockResolvedValue(
      baseOrder({
        status: JobStatus.FINISHED,
        downloadUrl: 'https://b2/final.zip',
      }),
    );

    const result = await service.finalizeDelivery('job-1');

    expect(mockRepository.markPaymentPaid).toHaveBeenCalledWith('job-1');
    expect(mockRepository.unlockResult).toHaveBeenCalledWith('job-1');
    expect(mockGateway.getJobMeta).not.toHaveBeenCalled();
    expect(mockPackagingService.packageRenderResult).not.toHaveBeenCalled();
    expect(result?.status).toBe(JobStatus.FINISHED);
    expect(result?.downloadUrl).toBe('https://b2/final.zip');
  });
});

/**
 * Test cho lỗ hổng IDOR phát hiện qua self-review (audit 2026-07-30):
 * trước đây mọi route theo `:id` (preview/approve/cancel/download/logs/
 * notifications) chỉ dựa vào việc UUID khó đoán, KHÔNG hề kiểm tra chủ
 * sở hữu — bất kỳ ai biết job id là xem/thao tác được job của khách
 * khác. Đã sửa bằng JobsService.assertOwnership() (private, test gián
 * tiếp qua các method public gọi nó).
 */
describe('JobsService — kiểm tra quyền sở hữu job (IDOR fix)', () => {
  let service: JobsService;
  let mockRepository: {
    findById: jest.Mock;
    markCancelled: jest.Mock;
  };
  let mockGateway: { adminCancelJob: jest.Mock };

  function baseOrder(overrides: Partial<RenderOrder> = {}): RenderOrder {
    return {
      id: 'job-1',
      projectName: 'scene.blend',
      software: null,
      softwareVersion: null,
      notes: null,
      storageCode: 'CWS-AAAAAAAA',
      customerId: 'customer-owner',
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
      markCancelled: jest.fn(),
    };
    mockGateway = { adminCancelJob: jest.fn().mockResolvedValue(1) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: RENDER_ORDERS_REPOSITORY, useValue: mockRepository },
        { provide: WorkerFleetGateway, useValue: mockGateway },
        { provide: PACKAGING_SERVICE, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: B2StorageService, useValue: {} },
        { provide: PaymentsService, useValue: {} },
        { provide: PricingService, useValue: {} },
      ],
    }).compile();

    service = module.get(JobsService);
  });

  it('getByIdForCustomer() từ chối khách KHÁC chủ job (403, không phải 404)', async () => {
    mockRepository.findById.mockResolvedValue(baseOrder());

    await expect(
      service.getByIdForCustomer('job-1', 'customer-attacker'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('getByIdForCustomer() từ chối khách ẩn danh (chưa đăng nhập) xem job đã có chủ', async () => {
    mockRepository.findById.mockResolvedValue(baseOrder());

    await expect(service.getByIdForCustomer('job-1', null)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('getByIdForCustomer() cho phép đúng chủ job xem job của mình', async () => {
    mockRepository.findById.mockResolvedValue(baseOrder());

    await expect(
      service.getByIdForCustomer('job-1', 'customer-owner'),
    ).resolves.toMatchObject({
      id: 'job-1',
    });
  });

  it('getByIdForCustomer() cho phép Admin (x-admin-key) xem job của bất kỳ ai', async () => {
    mockRepository.findById.mockResolvedValue(baseOrder());

    await expect(
      service.getByIdForCustomer('job-1', 'customer-attacker', true),
    ).resolves.toMatchObject({ id: 'job-1' });
  });

  it('getByIdForCustomer() KHÔNG chặn job chưa có chủ (customerId=null) — luồng khách vãng lai', async () => {
    mockRepository.findById.mockResolvedValue(baseOrder({ customerId: null }));

    await expect(
      service.getByIdForCustomer('job-1', 'bat-ky-ai'),
    ).resolves.toMatchObject({
      id: 'job-1',
    });
  });

  it('cancel() từ chối khách không phải chủ job — không cho huỷ job của người khác', async () => {
    mockRepository.findById.mockResolvedValue(baseOrder());

    await expect(service.cancel('job-1', 'customer-attacker')).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockRepository.markCancelled).not.toHaveBeenCalled();
  });

  it('cancel() cho phép huỷ khi job còn ở giai đoạn miễn phí (REVIEW_READY, trước khi thanh toán)', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({ status: JobStatus.REVIEW_READY }),
    );
    mockRepository.markCancelled.mockResolvedValue(
      baseOrder({ status: JobStatus.CANCELLED }),
    );

    await expect(
      service.cancel('job-1', 'customer-owner'),
    ).resolves.toMatchObject({ status: JobStatus.CANCELLED });
    expect(mockRepository.markCancelled).toHaveBeenCalledWith('job-1');
  });

  it('cancel() báo Worker Fleet huỷ task qua internalJobId (không phải render_orders.id) — bug đã sửa: trước đây cancel() không hề báo Worker', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({
        status: JobStatus.REVIEW_READY,
        internalJobId: 'internal-1',
      }),
    );
    mockRepository.markCancelled.mockResolvedValue(
      baseOrder({ status: JobStatus.CANCELLED }),
    );

    await service.cancel('job-1', 'customer-owner');

    expect(mockGateway.adminCancelJob).toHaveBeenCalledWith('internal-1');
  });

  it('cancel() bỏ qua việc báo Worker Fleet nếu job chưa có internalJobId (chưa từng tạo internal job)', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({ status: JobStatus.REVIEW_READY, internalJobId: null }),
    );
    mockRepository.markCancelled.mockResolvedValue(
      baseOrder({ status: JobStatus.CANCELLED }),
    );

    await service.cancel('job-1', 'customer-owner');

    expect(mockGateway.adminCancelJob).not.toHaveBeenCalled();
  });

  it('cancel() vẫn trả về job đã huỷ dù RPC báo Worker Fleet lỗi (không chặn khách nhìn thấy trạng thái huỷ)', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({
        status: JobStatus.REVIEW_READY,
        internalJobId: 'internal-1',
      }),
    );
    mockRepository.markCancelled.mockResolvedValue(
      baseOrder({ status: JobStatus.CANCELLED }),
    );
    mockGateway.adminCancelJob.mockRejectedValue(new Error('RPC lỗi mạng'));

    await expect(
      service.cancel('job-1', 'customer-owner'),
    ).resolves.toMatchObject({ status: JobStatus.CANCELLED });
  });

  it('cancel() TỪ CHỐI huỷ khi job đã AWAITING_PAYMENT (bug tự phát hiện: tránh khách mất tiền mà không nhận được file)', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({ status: JobStatus.AWAITING_PAYMENT, paymentId: 'payment-1' }),
    );

    await expect(service.cancel('job-1', 'customer-owner')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRepository.markCancelled).not.toHaveBeenCalled();
  });

  it('cancel() TỪ CHỐI huỷ khi job đã FINISHED', async () => {
    mockRepository.findById.mockResolvedValue(
      baseOrder({ status: JobStatus.FINISHED }),
    );

    await expect(service.cancel('job-1', 'customer-owner')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRepository.markCancelled).not.toHaveBeenCalled();
  });
});
