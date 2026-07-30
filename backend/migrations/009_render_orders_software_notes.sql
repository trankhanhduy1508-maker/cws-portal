-- Migration 009: software/software_version/notes trên render_orders
-- Sửa mismatch với CWS_MVP_WORKFLOW_FINAL.md, mục "Tạo Job": "Khách
-- nhập: Tên dự án. Phần mềm. Phiên bản. Link chia sẻ. Ghi chú." —
-- trước migration này, render_orders không có cột nào lưu 3 thông tin
-- "Phần mềm/Phiên bản/Ghi chú", dữ liệu bị mất ngay từ lúc nhận request.

ALTER TABLE render_orders
  ADD COLUMN IF NOT EXISTS software text,
  ADD COLUMN IF NOT EXISTS software_version text,
  ADD COLUMN IF NOT EXISTS notes text;
