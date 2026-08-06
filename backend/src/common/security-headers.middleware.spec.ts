import { securityHeadersMiddleware } from './security-headers.middleware';

describe('securityHeadersMiddleware', () => {
  it('sets baseline API response security headers', () => {
    const response = { setHeader: jest.fn() };
    const next = jest.fn();
    securityHeadersMiddleware({} as never, response as never, next);
    expect(response.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(response.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
