import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentMethod, PaymentStatus } from './payment.types';

describe('PaymentsService payment access', () => {
  const record = {
    paymentId: 'payment-1',
    amountVnd: 45000,
    method: PaymentMethod.QR_BANK,
    status: PaymentStatus.PROCESSING,
    createdAt: Date.now(),
    confirmedAt: null,
    paymentCode: 'PAY123',
    transferContent: 'CWS CWS-12345678 PAY123',
    jobId: 'job-1',
    storageCode: 'CWS-12345678',
    bankName: 'MB',
    accountNumber: 'masked',
    qrImageUrl: null,
  };

  function makeService(owned: boolean) {
    const repository = {
      findById: jest.fn().mockResolvedValue(record),
      isOwnedByCustomer: jest.fn().mockResolvedValue(owned),
    };
    return {
      service: new PaymentsService(
        repository as never,
        { touchNotification: jest.fn() } as never,
        {} as never,
      ),
      repository,
    };
  }

  it('denies an authenticated customer who does not own the payment', async () => {
    const { service, repository } = makeService(false);
    await expect(
      service.getPublicDetails('payment-1', 'other-customer'),
    ).rejects.toThrow(NotFoundException);
    expect(repository.isOwnedByCustomer).toHaveBeenCalledWith(
      'payment-1',
      'other-customer',
    );
  });

  it('allows the owning customer and never exposes internal ownership fields', async () => {
    const { service } = makeService(true);
    await expect(
      service.getPublicDetails('payment-1', 'customer-1'),
    ).resolves.toEqual({
      paymentId: 'payment-1',
      status: PaymentStatus.PROCESSING,
      paymentCode: 'PAY123',
      transferContent: 'CWS CWS-12345678 PAY123',
      amountVnd: 45000,
      qrImageUrl: null,
    });
  });

  it('allows only the server-verified Admin path without customer ownership', async () => {
    const { service, repository } = makeService(false);
    await expect(
      service.getPublicDetails('payment-1', null, true),
    ).resolves.toHaveProperty('paymentId', 'payment-1');
    expect(repository.isOwnedByCustomer).not.toHaveBeenCalled();
  });
});
