// ============================================================
// Supabase client — CHỈ dùng cho Auth (Google Login qua Supabase
// Auth, xem AuthService.js). Dữ liệu nghiệp vụ (jobs/payments/...) vẫn
// đi qua RenderService.js -> Backend NestJS như cũ, KHÔNG gọi thẳng
// Supabase từ đây — publishable key này chỉ có quyền theo RLS
// (auth.uid() = ...), không phải Service Role Key.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
// Keep the legacy anon-key name as a compatibility fallback. Both values are
// public browser keys; never fall back to a service-role/secret key.
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const IS_SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = IS_SUPABASE_CONFIGURED
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
