-- Migration 016: chuyển Auth từ Facebook sang Google (DECISIONS.md:
-- "Google OAuth qua Supabase Auth duy nhất cho MVP, Facebook Login đã
-- gỡ khỏi MVP"). KHÔNG xoá dữ liệu production, KHÔNG drop cột Facebook
-- cũ (facebook_id) — chỉ đánh dấu obsolete và sửa hành vi trigger.
--
-- PHÁT HIỆN khi audit trực tiếp production (2026-08-01) qua Supabase
-- MCP: migration 012 (customer_profiles_consent.sql) có trong repo
-- nhưng CHƯA từng được áp dụng lên production — bảng customer_profiles
-- thật vẫn KHÔNG có cột consent_source/consent_at/last_login_at, hàm
-- handle_new_auth_user() thật vẫn là bản gốc của migration 007. Migration
-- này viết lại ADD COLUMN IF NOT EXISTS để tự bắt kịp 012 (an toàn, không
-- ảnh hưởng nếu môi trường khác đã áp dụng 012 rồi) trước khi áp dụng
-- fix Google.
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS consent_source text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Trước đây (migration 012) hardcode consent_source = 'facebook_login'
-- cho MỌI lượt đăng nhập mới, bất kể provider thật là gì — sai lệch dữ
-- liệu ngay khi Provider chuyển sang Google. Sửa: đọc provider THẬT từ
-- auth.users.raw_app_meta_data->>'provider' (Supabase Auth tự ghi giá
-- trị này, vd 'google', không cần Backend tự khai báo). full_name/
-- avatar_url vẫn dùng chung 1 bộ khoá (full_name/name, avatar_url/
-- picture) vì Google trả về đúng các khoá này trong raw_user_meta_data
-- giống Facebook trước đây — không cần đổi logic đọc profile.
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
    COALESCE(NEW.raw_app_meta_data->>'provider', 'unknown') || '_login',
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

-- facebook_id (migration 005) chưa từng được trigger ghi vào (trigger
-- luôn dùng auth.users.id làm PK, không lưu facebook_id riêng) — cột
-- rỗng 100% ở mọi hàng hiện có. Giữ lại (không drop) để không mất cột
-- nếu có dữ liệu ngoài luồng đã ghi vào, chỉ đánh dấu rõ là obsolete.
COMMENT ON COLUMN customer_profiles.facebook_id IS
  'DEPRECATED (migration 016): Facebook Login đã gỡ khỏi MVP (DECISIONS.md). Cột không còn được ghi bởi handle_new_auth_user() — giữ lại để không mất dữ liệu cũ, có thể drop sau khi xác nhận không còn phụ thuộc.';
