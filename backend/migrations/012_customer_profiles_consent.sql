-- Migration 012: consent + last_login trên customer_profiles
-- Bổ sung tối thiểu cho yêu cầu "lưu consent_source, thời điểm thu thập
-- và nguồn dữ liệu" khi khách đăng nhập Facebook (không lưu access
-- token Facebook, không tự suy diễn dữ liệu khách không cung cấp).

ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS consent_source text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Cập nhật trigger (migration 007): ghi nhận consent lần đầu (insert)
-- và cập nhật last_login_at mỗi lần khách đăng nhập lại (update).
-- Không ghi đè consent_source/consent_at đã có ở lần đăng nhập sau.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, full_name, email, avatar_url, consent_source, consent_at, last_login_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'facebook_login',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, customer_profiles.full_name),
    email = COALESCE(EXCLUDED.email, customer_profiles.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, customer_profiles.avatar_url),
    last_login_at = now(),
    updated_at = now();
  RETURN NEW;
END;
$$;
