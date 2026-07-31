import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { NotificationSecretGuard } from './notification-secret.guard';

function makeContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

function makeConfigService(
  mbbankNotificationSecret: string | null,
): ConfigService<AppConfig, true> {
  return {
    get: jest.fn().mockReturnValue(mbbankNotificationSecret),
  } as unknown as ConfigService<AppConfig, true>;
}

describe('NotificationSecretGuard', () => {
  it('từ chối khi MBBANK_NOTIFICATION_SECRET chưa được cấu hình (fail-closed)', () => {
    const guard = new NotificationSecretGuard(makeConfigService(null));

    expect(() =>
      guard.canActivate(makeContext({ 'x-notification-secret': 'anything' })),
    ).toThrow(UnauthorizedException);
  });

  it('từ chối khi header x-notification-secret sai hoặc thiếu', () => {
    const guard = new NotificationSecretGuard(makeConfigService('correct-secret'));

    expect(() =>
      guard.canActivate(makeContext({ 'x-notification-secret': 'wrong-secret' })),
    ).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
  });

  it('cho qua khi header x-notification-secret khớp đúng secret đã cấu hình', () => {
    const guard = new NotificationSecretGuard(makeConfigService('correct-secret'));

    expect(
      guard.canActivate(makeContext({ 'x-notification-secret': 'correct-secret' })),
    ).toBe(true);
  });
});
