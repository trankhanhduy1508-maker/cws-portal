-- Migration 005: schema lõi theo CWS_DATABASE_SCHEMA.md (MVP V1)
-- ĐÃ ÁP DỤNG trực tiếp lên Supabase project ynhxlxetwuiyejcjypsi qua
-- MCP (2026-07-30). File này lưu lại để đồng bộ version control.
--
-- Bảng `jobs` trong CWS_DATABASE_SCHEMA.md KHÔNG được tạo mới vì tên
-- này đã bị chiếm bởi bảng `jobs` của hệ Worker Fleet cũ (blend_link,
-- tasks, 712 rows) — hoàn toàn khác domain. `render_orders` (đã có từ
-- migration 001) đóng đúng vai trò "jobs" của MVP nên được MỞ RỘNG
-- thêm cột thay vì tạo bảng trùng tên/trùng vai trò.

CREATE TABLE IF NOT EXISTS customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_id text UNIQUE,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  preferred_contact text,
  marketing_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE render_orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customer_profiles(id);
ALTER TABLE render_orders ADD COLUMN IF NOT EXISTS software text;
ALTER TABLE render_orders ADD COLUMN IF NOT EXISTS software_version text;
ALTER TABLE render_orders ADD COLUMN IF NOT EXISTS storage_code text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_render_orders_customer_id ON render_orders (customer_id);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES render_orders(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_code text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transfer_content text;
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments (job_id);

CREATE TABLE IF NOT EXISTS storage_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES render_orders(id),
  source_path text,
  review_path text,
  final_path text,
  log_path text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE storage_objects ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_storage_objects_job_id ON storage_objects (job_id);

CREATE TABLE IF NOT EXISTS review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES render_orders(id),
  image_path text,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_review_images_job_id ON review_images (job_id);

CREATE TABLE IF NOT EXISTS downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES render_orders(id),
  customer_id uuid REFERENCES customer_profiles(id),
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_downloads_job_id ON downloads (job_id);

CREATE TABLE IF NOT EXISTS worker_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES render_orders(id),
  worker_name text,
  message text,
  level text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE worker_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_worker_logs_job_id ON worker_logs (job_id);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customer_profiles(id),
  job_id uuid REFERENCES render_orders(id),
  title text,
  content text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications (customer_id);
