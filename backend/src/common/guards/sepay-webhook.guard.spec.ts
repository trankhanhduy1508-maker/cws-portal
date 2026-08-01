import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { SepayWebhookGuard } from './sepay-webhook.guard';

function makeContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

function makeConfigService(sepayWebhookApiKey: string | null): ConfigService<AppConfig, true> {
  return {
    get: jest.fn().mockReturnValue(sepayWebhookApiKey),
  } as unknown as ConfigService<AppConfig, true>;
}

describe('SepayWebhookGuard', () => {
  it('từ chối khi SEPAY_WEBHOOK_API_KEY chưa được cấu hình (fail-closed)', () => {
    const guard = new SepayWebhookGuard(makeConfigService(null));

    expect(() =>
      guard.canActivate(makeContext({ authorization: 'Apikey anything' })),
    ).toThrow(UnauthorizedException);
  });

  it('từ chối khi thiếu header Authorization', () => {
    const guard = new SepayWebhookGuard(makeConfigService('correct-key'));

    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
  });

  it('từ chối khi Authorization sai key hoặc sai định dạng "Apikey <key>"', () => {
    const guard = new SepayWebhookGuard(makeConfigService('correct-key'));

    expect(() =>
      guard.canActivate(makeContext({ authorization: 'Apikey wrong-key' })),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(makeContext({ authorization: 'Bearer correct-key' })),
    ).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(makeContext({ authorization: 'correct-key' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('cho qua khi header Authorization khớp đúng "Apikey <key>" đã cấu hình', () => {
    const guard = new SepayWebhookGuard(makeConfigService('correct-key'));

    expect(guard.canActivate(makeContext({ authorization: 'Apikey correct-key' }))).toBe(true);
  });
});
