import { describe, it, expect, vi, afterEach } from 'vitest';

describe('supabaseClient public configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('@supabase/supabase-js');
    vi.resetModules();
  });

  it('accepts the legacy public anon-key env without accepting a secret key', async () => {
    const createClient = vi.fn(() => ({ auth: {} }));
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');
    vi.doMock('@supabase/supabase-js', () => ({ createClient }));

    const client = await import('./supabaseClient');

    expect(client.IS_SUPABASE_CONFIGURED).toBe(true);
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'public-anon-key');
  });
});
