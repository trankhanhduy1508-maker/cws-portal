-- Migration 006: thêm 'review_ready' vào render_orders.status
-- ĐÃ ÁP DỤNG trực tiếp lên Supabase project ynhxlxetwuiyejcjypsi (2026-07-30).
--
-- Lý do: trước migration này, Scheduler đóng gói + mở link tải NGAY khi
-- render xong, KHÔNG có bước preview/duyệt nào — vi phạm CWS_ROADMAP_MVP_V1.md
-- Giai đoạn 4 ("Khách chỉ xem preview, chưa được tải file gốc"). Trạng
-- thái mới REVIEW_READY chèn giữa RENDERING và PACKAGING: Scheduler dừng
-- ở đây sau khi tạo xong 3-5 ảnh preview watermark, chỉ tiếp tục đóng
-- gói khi khách gọi POST /jobs/:id/approve.

ALTER TABLE render_orders DROP CONSTRAINT IF EXISTS render_orders_status_check;
ALTER TABLE render_orders ADD CONSTRAINT render_orders_status_check CHECK (status IN (
  'queued', 'searching_workers', 'allocating_workers', 'workers_connected',
  'rendering', 'review_ready', 'packaging', 'awaiting_payment', 'finished', 'error', 'cancelled'
));
