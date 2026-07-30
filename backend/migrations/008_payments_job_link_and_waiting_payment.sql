-- Migration 008: gắn payments vào job + dùng trạng thái awaiting_payment
-- Sửa mismatch với CWS_DATABASE_SCHEMA.md (payments thiếu job_id/
-- bank_name/account_number) và CWS_MVP_WORKFLOW_FINAL.md (thanh toán
-- phải diễn ra SAU khi khách duyệt preview, không phải trước khi tạo
-- job — QR sinh ra tại bước approve(), webhook đối chiếu cả
-- payment_code lẫn storage_code).
--
-- Ghi chú: migration 006 đã thêm sẵn 'awaiting_payment' vào CHECK
-- constraint của render_orders.status (dự trù trước nhưng chưa từng
-- được code TypeScript dùng tới) — migration này CHỈ thêm cột cho
-- payments, không cần đổi constraint của render_orders.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES render_orders(id),
  ADD COLUMN IF NOT EXISTS storage_code text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS qr_image_url text;

CREATE INDEX IF NOT EXISTS idx_payments_job_id ON payments (job_id);
