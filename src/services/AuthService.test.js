import { describe, it, expect, vi, afterEach } from 'vitest';

// AuthService.js đọc IS_SUPABASE_CONFIGURED/import.meta.env.DEV/
// VITE_ENABLE_MOCK_AUTH tại thời điểm IMPORT module — mỗi test cần
// vi.resetModules() + mock lại './supabaseClient' trước khi import động,
// để mô phỏng đúng các tổ hợp cấu hình khác nhau (bug thật: thiếu .env
// khiến khách bị đăng nhập giả thay vì thấy lỗi rõ ràng).

async function loadAuthService({ configured, dev, enableMock }) {
  vi.resetModules();
  vi.stubEnv('DEV', dev);
  vi.stubEnv('VITE_ENABLE_MOCK_AUTH', enableMock ? 'true' : '');

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

describe('AuthService.startFacebookLogin()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('./supabaseClient');
  });

  it('BUG THẬT ĐÃ SỬA: thiếu cấu hình Supabase (production, không bật mock) -> throw lỗi rõ ràng, KHÔNG âm thầm đăng nhập giả', async () => {
    const { startFacebookLogin } = await loadAuthService({
      configured: false,
      dev: false,
      enableMock: false,
    });

    await expect(startFacebookLogin()).rejects.toThrow(/chưa được cấu hình/i);
  });

  it('thiếu cấu hình Supabase nhưng đang dev VÀ chủ động bật VITE_ENABLE_MOCK_AUTH -> dùng mock (demo cục bộ)', async () => {
    const { startFacebookLogin } = await loadAuthService({
      configured: false,
      dev: true,
      enableMock: true,
    });

    const customer = await startFacebookLogin();
    expect(customer).toMatchObject({ id: 'mock-customer-demo' });
  });

  it('dev nhưng KHÔNG bật VITE_ENABLE_MOCK_AUTH -> vẫn throw (mock không tự động bật chỉ vì đang dev)', async () => {
    const { startFacebookLogin } = await loadAuthService({
      configured: false,
      dev: true,
      enableMock: false,
    });

    await expect(startFacebookLogin()).rejects.toThrow(/chưa được cấu hình/i);
  });

  it('đã cấu hình Supabase thật -> gọi signInWithOAuth(provider facebook) và trả về null (điều hướng rời trang, KHÔNG trả customer giả ngay lập tức)', async () => {
    const { startFacebookLogin } = await loadAuthService({
      configured: true,
      dev: false,
      enableMock: false,
    });
    const { supabase } = await import('./supabaseClient');

    const result = await startFacebookLogin();

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'facebook' }),
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
      enableMock: false,
    });

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
