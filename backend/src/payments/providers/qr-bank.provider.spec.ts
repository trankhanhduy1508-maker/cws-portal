import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { PaymentStatus } from '../payment.types';
import { QrBankProvider } from './qr-bank.provider';

// Số tài khoản/tên chủ tài khoản dưới đây LÀ DỮ LIỆU GIẢ chỉ để test
// logic build URL, KHÔNG phải tài khoản MB Bank thật của CWS (không
// commit thông tin ngân hàng thật vào source, kể cả trong test).
const FAKE_ACCOUNT_NUMBER = '0011223344';
const FAKE_ACCOUNT_NAME = 'NGUYEN VAN TEST';

function makeConfigService(mbBank: { accountNumber: string | null; accountName: string | null }) {
  return {
    get: jest.fn().mockReturnValue(mbBank),
  } as unknown as ConfigService<AppConfig, true>;
}

describe('QrBankProvider.createIntent()', () => {
  it('CHƯA có MB_BANK_ACCOUNT_NUMBER -> KHÔNG bịa ảnh QR, chỉ trả transferContent dạng text', async () => {
    const provider = new QrBankProvider(makeConfigService({ accountNumber: null, accountName: null }));

    const result = await provider.createIntent(45000, 'CWS-AAAAAAAA');

    expect(result.qrImageUrl).toBeNull();
    expect(result.bankName).toBeNull();
    expect(result.accountNumber).toBeNull();
    expect(result.status).toBe(PaymentStatus.PROCESSING);
    expect(result.transferContent).toMatch(/^CWS CWS-AAAAAAAA [A-F0-9]{8}$/);
    expect(result.paymentCode).toMatch(/^[A-F0-9]{8}$/);
  });

  it('có storageCode -> transferContent = "CWS {storageCode} {paymentCode}"', async () => {
    const provider = new QrBankProvider(
      makeConfigService({ accountNumber: FAKE_ACCOUNT_NUMBER, accountName: FAKE_ACCOUNT_NAME }),
    );

    const result = await provider.createIntent(45000, 'CWS-AAAAAAAA');

    expect(result.transferContent).toBe(`CWS CWS-AAAAAAAA ${result.paymentCode}`);
  });

  it('KHÔNG có storageCode (payment tạo độc lập, không qua job) -> transferContent = "CWS {paymentCode}" (không có 2 khoảng trắng)', async () => {
    const provider = new QrBankProvider(
      makeConfigService({ accountNumber: FAKE_ACCOUNT_NUMBER, accountName: FAKE_ACCOUNT_NAME }),
    );

    const result = await provider.createIntent(45000, null);

    expect(result.transferContent).toBe(`CWS ${result.paymentCode}`);
  });

  it('ĐÃ có MB_BANK_ACCOUNT_NUMBER -> dựng ảnh VietQR thật với đúng BIN MB Bank + amount + nội dung + tên chủ TK', async () => {
    const provider = new QrBankProvider(
      makeConfigService({ accountNumber: FAKE_ACCOUNT_NUMBER, accountName: FAKE_ACCOUNT_NAME }),
    );

    const result = await provider.createIntent(45000, 'CWS-AAAAAAAA');

    expect(result.qrImageUrl).not.toBeNull();
    expect(result.qrImageUrl).toContain(`https://img.vietqr.io/image/970422-${FAKE_ACCOUNT_NUMBER}-compact2.png`);
    expect(result.qrImageUrl).toContain('amount=45000');
    expect(result.qrImageUrl).toContain(`addInfo=${encodeURIComponent(result.transferContent!).replace(/%20/g, '+')}`);
    expect(result.qrImageUrl).toContain('accountName=NGUYEN+VAN+TEST');
    expect(result.bankName).toBe('MB Bank');
    expect(result.accountNumber).toBe(FAKE_ACCOUNT_NUMBER);
  });

  it('làm tròn số tiền có phần thập phân trong URL QR (VietQR yêu cầu amount nguyên)', async () => {
    const provider = new QrBankProvider(
      makeConfigService({ accountNumber: FAKE_ACCOUNT_NUMBER, accountName: FAKE_ACCOUNT_NAME }),
    );

    const result = await provider.createIntent(45000.6, 'CWS-AAAAAAAA');

    expect(result.qrImageUrl).toContain('amount=45001');
  });
});

describe('QrBankProvider.confirm()', () => {
  it('LUÔN throw -- qr_bank không được tự đặt PAID, chỉ webhook (PaymentsService.confirmViaWebhook/confirmViaSepayWebhook) mới hợp lệ', async () => {
    const provider = new QrBankProvider(makeConfigService({ accountNumber: null, accountName: null }));

    await expect(provider.confirm('qr-ANYTHING')).rejects.toThrow(BadRequestException);
  });
});
