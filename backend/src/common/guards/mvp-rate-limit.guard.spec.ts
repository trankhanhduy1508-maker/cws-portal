import { ExecutionContext } from '@nestjs/common';
import { MvpRateLimitGuard } from './mvp-rate-limit.guard';

function context(path: string) {
  const response = { setHeader: jest.fn() };
  const request = { path, method: 'POST', ip: '198.51.100.10', socket: {} };
  return {
    response,
    execution: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext,
  };
}

describe('MvpRateLimitGuard', () => {
  it('returns 429 after the upload limit and sets Retry-After', () => {
    const guard = new MvpRateLimitGuard();
    for (let i = 0; i < 5; i++) {
      const { execution } = context('/files/upload');
      expect(guard.canActivate(execution)).toBe(true);
    }

    const { execution, response } = context('/files/upload');
    expect(() => guard.canActivate(execution)).toThrow(/quá nhiều/i);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      expect.any(String),
    );
  });

  it('does not rate-limit unrelated routes', () => {
    const guard = new MvpRateLimitGuard();
    const { execution } = context('/health');
    expect(guard.canActivate(execution)).toBe(true);
  });
});
