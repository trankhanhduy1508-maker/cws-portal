import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { AppConfig } from '../../config/configuration';
import { SepayWebhookGuard } from './sepay-webhook.guard';

const HMAC_SECRET = 'test-hmac-secret';
const API_KEY = 'test-api-key';

function makeContext(headers: Record<string, string>, rawBody = '{}'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, rawBody: Buffer.from(rawBody, 'utf8') }),
    }),
  } as unknown as ExecutionContext;
}

function makeConfigService(config: {
  hmacSecret?: string | null;
  apiKey?: string | null;
}): ConfigService<AppConfig, true> {
  return {
    get: jest.fn((key: string) => {
      if (key === 'sepayWebhookHmacSecret') return config.hmacSecret ?? null;
      if (key === 'sepayWebhookApiKey') return config.apiKey ?? null;
      return null;
    }),
  } as unknown as ConfigService<AppConfig, true>;
}

function sign(timestamp: string, rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

describe('SepayWebhookGuard', () => {
  it('từ chối khi CHƯA cấu hình cả HMAC secret lẫn API key (fail-closed)', () => {
    const guard = new SepayWebhookGuard(makeConfigService({}));

    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
  });

  describe('chế độ HMAC-SHA256 (ưu tiên khi có cấu hình)', () => {
    it('cho qua khi chữ ký + timestamp hợp lệ', () => {
      const guard = new SepayWebhookGuard(makeConfigService({ hmacSecret: HMAC_SECRET }));
      const rawBody = '{"id":1,"transferAmount":45000}';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = sign(timestamp, rawBody, HMAC_SECRET);

      expect(
        guard.canActivate(
          makeContext({ 'x-sepay-signature': `sha256=${signature}`, 'x-sepay-timestamp': timestamp }, rawBody),
        ),
      ).toBe(true);
    });

    it('cho qua khi X-SePay-Signature KHÔNG có tiền tố "sha256=" (chỉ hex thuần)', () => {
      const guard = new SepayWebhookGuard(makeConfigService({ hmacSecret: HMAC_SECRET }));
      const rawBody = '{"id":1}';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = sign(timestamp, rawBody, HMAC_SECRET);

      expect(
        guard.canActivate(makeContext({ 'x-sepay-signature': signature, 'x-sepay-timestamp': timestamp }, rawBody)),
      ).toBe(true);
    });

    it('từ chối khi thiếu header X-SePay-Signature/X-SePay-Timestamp', () => {
      const guard = new SepayWebhookGuard(makeConfigService({ hmacSecret: HMAC_SECRET }));

      expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
    });

    it('TỪ CHỐI khi chữ ký sai (secret sai hoặc body bị sửa sau khi ký)', () => {
      const guard = new SepayWebhookGuard(makeConfigService({ hmacSecret: HMAC_SECRET }));
      const rawBody = '{"id":1}';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const wrongSignature = sign(timestamp, rawBody, 'wrong-secret');

      expect(() =>
        guard.canActivate(
          makeContext({ 'x-sepay-signature': `sha256=${wrongSignature}`, 'x-sepay-timestamp': timestamp }, rawBody),
        ),
      ).toThrow(UnauthorizedException);
    });

    it('CHỐNG REPLAY: từ chối khi X-SePay-Timestamp lệch quá 5 phút', () => {
      const guard = new SepayWebhookGuard(makeConfigService({ hmacSecret: HMAC_SECRET }));
      const rawBody = '{"id":1}';
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 10 * 60); // 10 phút trước
      const signature = sign(oldTimestamp, rawBody, HMAC_SECRET);

      expect(() =>
        guard.canActivate(
          makeContext({ 'x-sepay-signature': `sha256=${signature}`, 'x-sepay-timestamp': oldTimestamp }, rawBody),
        ),
      ).toThrow(UnauthorizedException);
    });

    it('từ chối khi X-SePay-Timestamp không phải số hợp lệ', () => {
      const guard = new SepayWebhookGuard(makeConfigService({ hmacSecret: HMAC_SECRET }));

      expect(() =>
        guard.canActivate(
          makeContext({ 'x-sepay-signature': 'sha256=abc', 'x-sepay-timestamp': 'not-a-number' }),
        ),
      ).toThrow(UnauthorizedException);
    });

    it('ƯU TIÊN HMAC khi cả HMAC secret lẫn API key đều được cấu hình', () => {
      // Cấu hình cả 2, nhưng chỉ gửi header kiểu HMAC -> guard phải dùng
      // nhánh HMAC (không rơi về API key), đúng "ưu tiên HMAC" trong DECISIONS.md.
      const guard = new SepayWebhookGuard(makeConfigService({ hmacSecret: HMAC_SECRET, apiKey: API_KEY }));
      const rawBody = '{"id":1}';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = sign(timestamp, rawBody, HMAC_SECRET);

      expect(
        guard.canActivate(
          makeContext({ 'x-sepay-signature': `sha256=${signature}`, 'x-sepay-timestamp': timestamp }, rawBody),
        ),
      ).toBe(true);
      // Gửi header kiểu API Key thay vì HMAC trong khi cả 2 đều cấu hình
      // -> vẫn bị từ chối vì guard đã chọn nhánh HMAC, không tự rơi về API key.
      expect(() =>
        guard.canActivate(makeContext({ authorization: `Apikey ${API_KEY}` })),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('chế độ API Key (fallback khi KHÔNG cấu hình HMAC secret)', () => {
    it('từ chối khi thiếu header Authorization', () => {
      const guard = new SepayWebhookGuard(makeConfigService({ apiKey: API_KEY }));

      expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
    });

    it('từ chối khi Authorization sai key hoặc sai định dạng "Apikey <key>"', () => {
      const guard = new SepayWebhookGuard(makeConfigService({ apiKey: API_KEY }));

      expect(() =>
        guard.canActivate(makeContext({ authorization: 'Apikey wrong-key' })),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.canActivate(makeContext({ authorization: `Bearer ${API_KEY}` })),
      ).toThrow(UnauthorizedException);
    });

    it('cho qua khi header Authorization khớp đúng "Apikey <key>" đã cấu hình', () => {
      const guard = new SepayWebhookGuard(makeConfigService({ apiKey: API_KEY }));

      expect(guard.canActivate(makeContext({ authorization: `Apikey ${API_KEY}` }))).toBe(true);
    });
  });
});
