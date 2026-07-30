# CODEX 2 CHECKLIST

## Vai trò

Supabase • Database • Backblaze B2

---

# Phase 1 - Audit

- [ ] Kiểm tra Supabase hiện tại — CLOUD_VERIFICATION_REQUIRED (chưa có project ref/credential để kiểm tra project thật)
- [x] So sánh Database với CWS_DATABASE_SCHEMA.md — MISMATCH nghiêm trọng. Migrations hiện tại (001_create_render_orders, 002_create_payments, 003_create_sites_and_wake_capability) mô tả 1 domain khác hẳn: `render_orders` (worker fleet, render profile economy/standard/priority/turbo), `sites`/`wake_capability`. KHÔNG có bảng nào trong 8 bảng của CWS_DATABASE_SCHEMA.md (customer_profiles, jobs, storage_objects, review_images, payments đúng field, downloads, worker_logs, notifications). Bảng `payments` hiện tại có field áp cho method wallet/stripe/paypal (đã sửa constraint ở migration 004, xem Files Changed) nhưng vẫn thiếu job_id, payment_code, storage_code, transfer_content theo schema MVP.
- [ ] Kiểm tra Facebook Auth — KHÔNG TÌM THẤY bất kỳ code nào implement Facebook Login (grep "facebook" trong src/backend chỉ khớp trong docs). Đây là BLOCKER lớn cho toàn bộ luồng MVP vì mọi bước sau đều phụ thuộc customer đã đăng nhập.
- [ ] Kiểm tra RLS
- [ ] Kiểm tra Trigger
- [x] Kiểm tra Migration — xem finding ở dòng "So sánh Database" phía trên. Đã thêm migration 004 (restrict payments.method còn qr_bank) nhưng CHƯA áp dụng lên Supabase thật (CLOUD_VERIFICATION_REQUIRED).
- [ ] Kiểm tra Enum
- [ ] Kiểm tra Index
- [ ] Kiểm tra Foreign Key

---

# Phase 2 - Storage

- [ ] Kiểm tra Bucket B2
- [ ] Kiểm tra cấu trúc source/
- [ ] Kiểm tra review/
- [ ] Kiểm tra final/
- [ ] Kiểm tra logs/
- [ ] Kiểm tra Signed URL
- [ ] Kiểm tra Lifecycle
- [ ] Kiểm tra quyền truy cập

---

# Phase 3 - Cleanup

- [ ] Xóa bảng không thuộc MVP
- [ ] Xóa Trigger cũ
- [ ] Xóa Function cũ
- [ ] Xóa Policy cũ
- [ ] Chuẩn hóa Database Schema

---

# Phase 4 - Test

- [ ] Test Customer Ownership
- [ ] Test Job Ownership
- [ ] Test Review Ownership
- [ ] Test Download Ownership
- [ ] Test Payment Protection

---

# Completed

- Audit: xác nhận schema DB hiện tại (render_orders/sites) không khớp CWS_DATABASE_SCHEMA.md (customer_profiles/jobs/...). Ghi rõ để domain Workflow biết trước khi build thêm tính năng trên model cũ.
- Migration 004: giới hạn payments.method chỉ còn 'qr_bank' (file đã tạo, CHƯA áp dụng lên Supabase thật).

---

# In Progress

- Chưa có access Supabase thật (project ref, service-role key) để kiểm tra RLS/Trigger/Enum/Index/FK và để apply migration 004.

---

# Pending

- Thiết kế + viết migration tạo 8 bảng theo CWS_DATABASE_SCHEMA.md (customer_profiles, jobs, storage_objects, review_images, payments đúng field MVP, downloads, worker_logs, notifications).
- Quyết định: migrate dữ liệu từ render_orders sang jobs, hay bỏ hẳn render_orders (cần business decision vì có thể có dữ liệu thật đã render).
- Kiểm tra RLS/Trigger/Enum/Index/FK khi có quyền truy cập Supabase.

---

# Risks

- MISMATCH schema là rủi ro lớn nhất của toàn dự án: Codex Workflow (payment, job, customer) không thể hoàn thiện đúng MVP nếu backend vẫn dùng model render_orders/sites. Cần quyết định: incremental migrate schema, hay giữ song song rồi cắt chuyển 1 lần.
- Migration 004 sẽ FAIL nếu bảng payments thật đang có bản ghi method khác 'qr_bank' — phải kiểm tra trước khi apply.

---

# Blockers

- CLOUD_VERIFICATION_REQUIRED: không có Supabase project ref / service-role key trong môi trường này để audit live DB hoặc áp dụng migration.

---

# Next Task

Khi có quyền truy cập Supabase (project ref + credential do người dùng cung cấp): chạy `list_tables` xác nhận schema thật khớp với migrations trong repo, rồi áp dụng migration 004 sau khi xác nhận không có bản ghi method khác 'qr_bank'.

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

tiếp

→ tiếp tục mục Pending đầu tiên.
