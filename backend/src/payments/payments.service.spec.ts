import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { QrBankProvider } from './providers/qr-bank.provider';
import { PaymentMethod, PaymentRecord, PaymentStatus } from './payment.types';

/**
 * Test cho phần webhook đối chiếu storage_code (audit 2026-07-30, sửa
 * theo CWS_MVP_WORKFLOW_FINAL.md: "Kiểm tra payment_code. Kiểm tra
 * storage_code."). Trước bản sửa này, webhook chỉ kiểm tra payment_code
 * + số tiền — không đối chiếu storage_code, nghĩa là 1 giao dịch chuyển
 * khoản có thể xác nhận NHẦM payment của 1 job khác nếu trùng payment_code.
 */
describe('PaymentsService.confirmViaWebhook()', () => {
  let service: PaymentsService;
  let mockRepository: {
    findByPaymentCode: jest.Mock;
    updateStatus: jest.Mock;
  };

  function baseRecord(overrides: Partial<PaymentRecord> = {}): PaymentRecord {
    return {
      paymentId: 'pay-1',
      amountVnd: 45000,
      method: PaymentMethod.QR_BANK,
      status: PaymentStatus.PROCESSING,
      createdAt: Date.now(),
      confirmedAt: null,
      paymentCode: 'AB12CD34',
      transferContent: 'CWS CWS-AAAAAAAA AB12CD34',
      jobId: 'job-1',
      storageCode: 'CWS-AAAAAAAA',
      bankName: 'MB Bank',
      accountNumber: '0123456789',
      qrImageUrl: null,
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockRepository = {
      findByPaymentCode: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: mockRepository },
        { provide: QrBankProvider, useValue: {} },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('từ chối nếu transferContent sai định dạng (thiếu storage_code)', async () => {
    await expect(
      service.confirmViaWebhook({ transferContent: 'CWS AB12CD34', amountVnd: 45000 }),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepository.findByPaymentCode).not.toHaveBeenCalled();
  });

  it('ném NotFoundException nếu không tìm thấy payment theo mã', async () => {
    mockRepository.findByPaymentCode.mockResolvedValue(null);

    await expect(
      service.confirmViaWebhook({ transferContent: 'CWS CWS-AAAAAAAA AB12CD34', amountVnd: 45000 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TỪ CHỐI nếu storage_code không khớp — dù payment_code + số tiền đúng', async () => {
    mockRepository.findByPaymentCode.mockResolvedValue(baseRecord({ storageCode: 'CWS-BBBBBBBB' }));

    await expect(
      service.confirmViaWebhook({ transferContent: 'CWS CWS-AAAAAAAA AB12CD34', amountVnd: 45000 }),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('từ chối nếu số tiền không khớp dù storage_code + payment_code đúng', async () => {
    mockRepository.findByPaymentCode.mockResolvedValue(baseRecord());

    await expect(
      service.confirmViaWebhook({ transferContent: 'CWS CWS-AAAAAAAA AB12CD34', amountVnd: 99999 }),
    ).rejects.toThrow(BadRequestException);
    expect(mockRepository.updateStatus).not.toHaveBeenCalled();
  });

  it('set PAID khi storage_code + payment_code + số tiền đều khớp', async () => {
    mockRepository.findByPaymentCode.mockResolvedValue(baseRecord());
    mockRepository.updateStatus.mockResolvedValue(baseRecord({ status: PaymentStatus.PAID }));

    const result = await service.confirmViaWebhook({
      transferContent: 'CWS CWS-AAAAAAAA AB12CD34',
      amountVnd: 45000,
    });

    expect(mockRepository.updateStatus).toHaveBeenCalledWith('pay-1', PaymentStatus.PAID);
    expect(result.status).toBe(PaymentStatus.PAID);
  });

  it('idempotent — payment đã PAID trước đó thì trả về ngay, không kiểm tra lại storage_code/số tiền', async () => {
    mockRepository.findByPaymentCode.mockResolvedValue(
      baseRecord({ status: PaymentStatus.PAID, storageCode: 'CWS-BBBBBBBB' }),
    );

    const result = await service.confirmViaWebhook({
      transferContent: 'CWS CWS-AAAAAAAA AB12CD34',
      amountVnd: 1,
    });

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(mockRepository.updateStatus).not.toHaveBeenCalled();
  });
});
