import { describe, it, expect, vi, afterEach } from 'vitest';

async function loadStaffAuth() {
  vi.resetModules();
  const auth = {
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google' }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'staff-token' } }, error: null }),
  };
  vi.doMock('./supabaseClient', () => ({
    IS_SUPABASE_CONFIGURED: true,
    supabase: { auth },
  }));
  const module = await import('./staffAuth');
  return { module, auth };
}

describe('staffAuth Google OAuth boundary', () => {
  afterEach(() => {
    vi.doUnmock('./supabaseClient');
    vi.resetModules();
  });

  it('returns Google OAuth to the initiating Admin origin root by default', async () => {
    const { module, auth } = await loadStaffAuth();
    await module.signInStaffWithGoogle();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  });

  it('reads the Supabase session without copying the bearer token to storage', async () => {
    const { module } = await loadStaffAuth();
    await expect(module.getStaffSession()).resolves.toEqual({ access_token: 'staff-token' });
  });
});
