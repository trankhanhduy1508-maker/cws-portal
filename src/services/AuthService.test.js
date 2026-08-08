import { describe, it, expect, vi, afterEach } from 'vitest';

// AuthService.js reads IS_SUPABASE_CONFIGURED at import time. Each test
// resets the module and mocks supabaseClient before dynamically importing it.

async function loadAuthService({ configured, dev }) {
  vi.resetModules();
  vi.stubEnv('DEV', dev);

  vi.doMock('./supabaseClient', () => ({
    IS_SUPABASE_CONFIGURED: configured,
    supabase: configured
      ? {
          auth: {
            signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          },
        }
      : null,
  }));

  return import('./AuthService');
}

describe('AuthService.startGoogleLogin()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('./supabaseClient');
  });

  it('BUG THẬT ĐÃ SỬA: thiếu cấu hình Supabase (production, không bật mock) -> throw lỗi rõ ràng, KHÔNG âm thầm đăng nhập giả', async () => {
    const { startGoogleLogin } = await loadAuthService({
      configured: false,
      dev: false,
    });

    await expect(startGoogleLogin()).rejects.toThrow(/chưa được cấu hình/i);
  });

  it('thiếu cấu hình Supabase trong dev vẫn fail rõ ràng; không có demo auth path', async () => {
    const { startGoogleLogin } = await loadAuthService({
      configured: false,
      dev: true,
    });

    await expect(startGoogleLogin()).rejects.toThrow(/chưa được cấu hình/i);
  });

  it('đã cấu hình Supabase thật -> gọi signInWithOAuth(provider google) và trả về null (điều hướng rời trang, KHÔNG trả customer giả ngay lập tức)', async () => {
    const { startGoogleLogin } = await loadAuthService({
      configured: true,
      dev: false,
    });
    const { supabase } = await import('./supabaseClient');

    const result = await startGoogleLogin();

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
    expect(result).toBeNull();
  });
});

describe('AuthService.getCurrentUser()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('./supabaseClient');
  });

  it('thiếu cấu hình và mock tắt -> null (KHÔNG có người dùng "đăng nhập" nào)', async () => {
    const { getCurrentUser } = await loadAuthService({
      configured: false,
      dev: false,
    });

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
