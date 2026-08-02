import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { AppConfig } from '../../config/configuration';
import { SepayWebhookTestGuard } from './sepay-webhook-test.guard';

const TEST_HMAC_SECRET = 'sandbox-hmac-secret';
const LIVE_HMAC_SECRET = 'live-hmac-secret';

function makeContext(headers: Record<string, string>, rawBody = '{}'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, rawBody: Buffer.from(rawBody, 'utf8') }),
    }),
  } as unknown as ExecutionContext;
}

function makeConfigService(config: {
  hmacSecretTest?: string | null;
  apiKeyTest?: string | null;
}): ConfigService<AppConfig, true> {
  return {
    get: jest.fn((key: string) => {
      if (key === 'sepayWebhookHmacSecretTest') return config.hmacSecretTest ?? null;
      if (key === 'sepayWebhookApiKeyTest') return config.apiKeyTest ?? null;
      return null;
    }),
  } as unknown as ConfigService<AppConfig, true>;
}

function sign(timestamp: string, rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

describe('SepayWebhookTestGuard (Sandbox — CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md)', () => {
  it('từ chối khi CHƯA cấu hình cả HMAC secret Test lẫn API key Test (fail-closed)', () => {
    const guard = new SepayWebhookTestGuard(makeConfigService({}));

    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
  });

  it('cho qua khi chữ ký ký bằng đúng secret Test Mode', () => {
    const guard = new SepayWebhookTestGuard(makeConfigService({ hmacSecretTest: TEST_HMAC_SECRET }));
    const rawBody = '{"id":1,"transferAmount":45000}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = sign(timestamp, rawBody, TEST_HMAC_SECRET);

    expect(
      guard.canActivate(
        makeContext({ 'x-sepay-signature': `sha256=${signature}`, 'x-sepay-timestamp': timestamp }, rawBody),
      ),
    ).toBe(true);
  });

  it('CÁCH LY SANDBOX/LIVE: từ chối chữ ký ký bằng secret LIVE (dù đúng định dạng HMAC-SHA256)', () => {
    // Đây là bằng chứng trực tiếp cho thiết kế tách môi trường: secret Live
    // không bao giờ xác thực được vào route/guard Test Mode, kể cả khi
    // Owner vô tình trỏ nhầm URL trên dashboard SePay Live vào route này.
    const guard = new SepayWebhookTestGuard(makeConfigService({ hmacSecretTest: TEST_HMAC_SECRET }));
    const rawBody = '{"id":1}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signatureSignedByLiveSecret = sign(timestamp, rawBody, LIVE_HMAC_SECRET);

    expect(() =>
      guard.canActivate(
        makeContext(
          { 'x-sepay-signature': `sha256=${signatureSignedByLiveSecret}`, 'x-sepay-timestamp': timestamp },
          rawBody,
        ),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('CHỐNG REPLAY: từ chối khi X-SePay-Timestamp lệch quá 5 phút (giống hệt guard Live)', () => {
    const guard = new SepayWebhookTestGuard(makeConfigService({ hmacSecretTest: TEST_HMAC_SECRET }));
    const rawBody = '{"id":1}';
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 10 * 60);
    const signature = sign(oldTimestamp, rawBody, TEST_HMAC_SECRET);

    expect(() =>
      guard.canActivate(
        makeContext({ 'x-sepay-signature': `sha256=${signature}`, 'x-sepay-timestamp': oldTimestamp }, rawBody),
      ),
    ).toThrow(UnauthorizedException);
  });
});
