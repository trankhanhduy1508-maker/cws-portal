-- Migration 011: giá THẬT theo runtime Worker thật (theo yêu cầu người
-- dùng, 2026-07-30 — tham khảo ý tưởng từ nhánh
-- claude/cws-zero-manual-operation-wtzbrt, đã bỏ phần vi phạm bảo mật
-- "frontend tự xác nhận thanh toán" của nhánh đó, giữ nguyên nguyên tắc
-- chỉ webhook mới set PAID).
--
-- Trước migration này, số tiền đưa vào QR MB Bank là estimate_cost_vnd
-- (ước tính HEURISTIC theo dung lượng file, tính TRƯỚC khi render) —
-- từ giờ JobsService.approve() tính lại giá THẬT theo runtime Worker
-- thật (PricingService) ngay trước khi sinh QR, lưu vào 2 cột mới này.

ALTER TABLE render_orders
  ADD COLUMN IF NOT EXISTS final_price_vnd integer,
  ADD COLUMN IF NOT EXISTS worker_runtime_seconds integer;
