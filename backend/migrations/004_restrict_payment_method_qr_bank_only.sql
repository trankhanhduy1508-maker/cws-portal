-- Migration 004: giới hạn payments.method chỉ còn 'qr_bank'
-- Lý do: CWS_ROADMAP_MVP_V1.md (Giai đoạn 5) chỉ dùng MB Bank QR.
-- Wallet/Stripe/PayPal không thuộc MVP (xem "Không làm trong MVP").
--
-- CLOUD_VERIFICATION_REQUIRED: chưa chạy migration này trên Supabase
-- thật (không có quyền truy cập project). Trước khi áp dụng, backup
-- bảng payments và xác nhận không còn bản ghi nào có method khác
-- 'qr_bank' (nếu có, migration này sẽ FAIL do vi phạm CHECK constraint).

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (method IN ('qr_bank'));
