import { UploadTimeoutInterceptor, UPLOAD_TIMEOUT_MS } from './upload-timeout.interceptor';

describe('UploadTimeoutInterceptor', () => {
  it('sets the timeout before multipart handling continues', () => {
    const setTimeout = jest.fn();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ setTimeout }) }),
    } as any;
    const next = { handle: jest.fn().mockReturnValue('next') } as any;

    expect(new UploadTimeoutInterceptor().intercept(context, next)).toBe('next');
    expect(setTimeout).toHaveBeenCalledWith(UPLOAD_TIMEOUT_MS);
    expect(next.handle).toHaveBeenCalledTimes(1);
  });
});
