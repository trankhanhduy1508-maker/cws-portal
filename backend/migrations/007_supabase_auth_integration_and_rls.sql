-- Migration 007: Supabase Auth (Facebook OAuth) + RLS owner-scoped
-- ĐÃ ÁP DỤNG trực tiếp lên Supabase project ynhxlxetwuiyejcjypsi.
--
-- Thay đổi kiến trúc: Facebook Login chuyển từ OAuth thủ công (Graph
-- API + JWT tự ký, xem migration cũ) sang dùng NGUYÊN cơ chế OAuth có
-- sẵn của Supabase Auth (`supabase.auth.signInWithOAuth({ provider:
-- 'facebook' })` phía Portal) — Facebook lo việc đăng nhập/xác minh,
-- Supabase Auth lo phiên đăng nhập, Backend/Portal không tự tay nhận
-- hay xử lý mật khẩu Facebook ở bất kỳ đâu.

-- customer_profiles.id giờ LÀ auth.users.id (bảng đang trống nên đổi PK an toàn).
ALTER TABLE customer_profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE customer_profiles ADD CONSTRAINT customer_profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tự tạo/cập nhật customer_profiles khi có user mới qua Supabase Auth —
-- ON CONFLICT đảm bảo không tạo trùng hồ sơ khi khách đăng nhập lại.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, customer_profiles.full_name),
    email = COALESCE(EXCLUDED.email, customer_profiles.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, customer_profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- RLS: bật cho 4 bảng advisory đã cảnh báo (render_orders/payments/
-- sites/machine_capability), chỉ cho khách đọc dữ liệu CỦA CHÍNH MÌNH —
-- không thiết kế phân quyền enterprise. Backend (service role) không
-- bị ảnh hưởng vì service_role luôn bypass RLS.
ALTER TABLE render_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_capability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer reads own profile" ON customer_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "customer updates own profile" ON customer_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "customer reads own jobs" ON render_orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "customer reads own review images" ON review_images
  FOR SELECT USING (
    job_id IN (SELECT id FROM render_orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "customer reads own downloads" ON downloads
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "customer reads own notifications" ON notifications
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "customer marks own notifications read" ON notifications
  FOR UPDATE USING (auth.uid() = customer_id);

-- payments/sites/machine_capability/storage_objects/worker_logs: KHÔNG
-- thêm policy nào — RLS bật + không policy = từ chối mọi truy cập trực
-- tiếp từ anon/authenticated, chỉ Backend (service_role) đọc/ghi được.
-- Đây là lựa chọn có chủ ý (đơn giản, không phải thiếu sót).
