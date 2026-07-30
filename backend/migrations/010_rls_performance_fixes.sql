-- Migration 010: sửa cảnh báo performance từ get_advisors trên chính
-- các policy/bảng MVP đã tạo (migration 005/007) — KHÔNG đụng
-- fleets/machine_capability (bảng Worker Fleet, ngoài phạm vi).
--
-- 1) auth_rls_initplan: auth.uid() trong policy bị re-evaluate cho MỖI
--    ROW thay vì 1 lần/query — thay bằng (select auth.uid()) theo đúng
--    khuyến nghị chính thức của Supabase, hành vi logic KHÔNG đổi.
-- 2) unindexed_foreign_keys: downloads.customer_id, notifications.job_id
--    thiếu index — thêm cho đủ, hỗ trợ RLS/JOIN theo các cột này.

DROP POLICY IF EXISTS "customer reads own profile" ON customer_profiles;
CREATE POLICY "customer reads own profile" ON customer_profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "customer updates own profile" ON customer_profiles;
CREATE POLICY "customer updates own profile" ON customer_profiles
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "customer reads own jobs" ON render_orders;
CREATE POLICY "customer reads own jobs" ON render_orders
  FOR SELECT USING ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "customer reads own review images" ON review_images;
CREATE POLICY "customer reads own review images" ON review_images
  FOR SELECT USING (
    job_id IN (SELECT id FROM render_orders WHERE customer_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "customer reads own downloads" ON downloads;
CREATE POLICY "customer reads own downloads" ON downloads
  FOR SELECT USING ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "customer reads own notifications" ON notifications;
CREATE POLICY "customer reads own notifications" ON notifications
  FOR SELECT USING ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "customer marks own notifications read" ON notifications;
CREATE POLICY "customer marks own notifications read" ON notifications
  FOR UPDATE USING ((select auth.uid()) = customer_id);

CREATE INDEX IF NOT EXISTS idx_downloads_customer_id ON downloads (customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_job_id ON notifications (job_id);
