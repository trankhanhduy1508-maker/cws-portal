import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { WebhookSecretGuard } from './webhook-secret.guard';

function makeContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

function makeConfigService(
  paymentWebhookSecret: string | null,
): ConfigService<AppConfig, true> {
  return {
    get: jest.fn().mockReturnValue(paymentWebhookSecret),
  } as unknown as ConfigService<AppConfig, true>;
}

describe('WebhookSecretGuard', () => {
  it('từ chối khi PAYMENT_WEBHOOK_SECRET chưa được cấu hình (fail-closed)', () => {
    const guard = new WebhookSecretGuard(makeConfigService(null));

    expect(() =>
      guard.canActivate(makeContext({ 'x-webhook-secret': 'anything' })),
    ).toThrow(UnauthorizedException);
  });

  it('từ chối khi header x-webhook-secret sai hoặc thiếu', () => {
    const guard = new WebhookSecretGuard(makeConfigService('correct-secret'));

    expect(() =>
      guard.canActivate(makeContext({ 'x-webhook-secret': 'wrong-secret' })),
    ).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(makeContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('cho qua khi header x-webhook-secret khớp đúng secret đã cấu hình', () => {
    const guard = new WebhookSecretGuard(makeConfigService('correct-secret'));

    expect(
      guard.canActivate(makeContext({ 'x-webhook-secret': 'correct-secret' })),
    ).toBe(true);
  });
});
