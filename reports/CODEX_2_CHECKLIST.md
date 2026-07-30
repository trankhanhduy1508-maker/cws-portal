# CODEX 2 CHECKLIST

## Vai trò

Supabase • Database • Backblaze B2

---

# Phase 1 - Audit

- [x] Kiểm tra Supabase hiện tại — Đã có Supabase MCP access, project `ynhxlxetwuiyejcjypsi`. Đã audit + migrate.
- [x] So sánh Database với CWS_DATABASE_SCHEMA.md — MISMATCH ban đầu đã fix qua migration 005 (thêm đủ customer_profiles/storage_objects/review_images/downloads/worker_logs/notifications) + migration 007 (customer_profiles.id = auth.users.id).
- [x] Kiểm tra Facebook Auth — ĐÃ CHUYỂN sang dùng Supabase Auth built-in OAuth (`supabase.auth.signInWithOAuth({ provider: 'facebook' })`), KHÔNG tự code Backend nhận credential Facebook. Trigger `handle_new_auth_user()` (migration 007) tự tạo/cập nhật customer_profiles khi có user mới, ON CONFLICT tránh trùng hồ sơ khi đăng nhập lại. CÒN BLOCKER: cần bật Facebook Provider thật trong Supabase Dashboard (App ID/Secret) — việc này chỉ người dùng làm được.
- [x] Kiểm tra RLS — Đã bật cho render_orders/payments/sites/machine_capability/customer_profiles/review_images/downloads/notifications (migration 007), policy owner-scoped (`auth.uid() = customer_id`/`= id`). payments/sites/machine_capability/storage_objects/worker_logs: bật RLS nhưng KHÔNG có policy nào (chủ ý — chỉ Backend service_role đọc/ghi được).
- [x] Kiểm tra Trigger — `on_auth_user_created` (AFTER INSERT OR UPDATE ON auth.users) đã tạo, đã apply lên Supabase thật.
- [x] Kiểm tra Migration — 004-010 đã APPLY thành công lên Supabase thật qua MCP `apply_migration` (xem migration 007/010 nội dung đầy đủ).
- [x] Kiểm tra Enum — job_status đã có REVIEW_READY/AWAITING_PAYMENT (migration 006), payment method giới hạn 'qr_bank' (migration 004).
- [x] Kiểm tra Index — chạy `get_advisors(performance)` thật: phát hiện + fix qua migration 010 — 7 policy RLS (customer_profiles x2, render_orders, review_images, downloads, notifications x2) re-evaluate `auth.uid()` mỗi row thay vì `(select auth.uid())` (khuyến nghị chính thức Supabase, không đổi hành vi logic); thêm index còn thiếu cho `downloads.customer_id`/`notifications.job_id`. Còn lại: `unindexed_foreign_keys` trên `fleets`/`machine_capability` (bảng Worker Fleet, ngoài phạm vi, không sửa) + `unused_index` (INFO, bình thường vì DB gần như trống, không phải vấn đề thật).
- [x] Kiểm tra Foreign Key — customer_profiles.id → auth.users.id (migration 007), review_images/downloads/notifications/worker_logs → render_orders/jobs qua job_id (migration 005).

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
- Migration 004: giới hạn payments.method chỉ còn 'qr_bank' (đã apply lên Supabase thật).
- Backend module storage_objects/review_images/downloads (StorageService: recordPaths/getPaths/publishReviewImages/logDownload, enforce 3-5 ảnh preview theo MVP). Xem PR #7. Bảng đã được tạo qua migration 005 (đã apply lên Supabase thật).
- Payment webhook thật: QrBankProvider sinh payment_code/transfer_content, POST /payments/webhook xác nhận PAID duy nhất qua nội dung+số tiền khớp. Xem PR #6.
- Migration 008 (audit cuối 2026-07-30): thêm payments.job_id/storage_code/bank_name/account_number/qr_image_url — khớp đủ field CWS_DATABASE_SCHEMA.md cho bảng payments (trước đó thiếu hoàn toàn liên kết tới job). Đã apply lên Supabase thật. Đi kèm sửa mismatch thứ tự thanh toán ở domain Workflow (xem CODEX_3_CHECKLIST.md).
- Migration 009 (software/software_version/notes), 010 (RLS performance + index), 011 (final_price_vnd/worker_runtime_seconds cho tính năng giá thật) — đã apply lên Supabase thật, đã verify lại bằng `list_tables` (2026-07-30) xác nhận đúng đủ cột trên `render_orders`/`payments`.
- **Phát hiện qua verify cuối cùng:** `render_orders` có 2 cột `preview_url`, `locked_result_key` KHÔNG nằm trong bất kỳ migration nào của mình — dấu vết từ migration 004 của nhánh `claude/cws-zero-manual-operation-wtzbrt` (phiên Claude trước) đã được áp dụng THẲNG lên Supabase thật (không qua git) rồi bị bỏ dở. 2 cột này nullable, không có code nào tham chiếu tới (không xung đột), CHƯA xoá vì đó là hành động phá huỷ không cần thiết — chỉ ghi nhận để biết nguồn gốc nếu sau này thấy lạ.

---

# In Progress

- (không còn — RLS/Trigger đã apply xong, xem Completed)

---

# Pending

- Kiểm tra Bucket B2 thật (cấu trúc source/review/final/logs, signed URL, lifecycle) — CLOUD_VERIFICATION_REQUIRED, cần rotate B2 key trước (xem SECURITY INCIDENT bên dưới) rồi mới nên dùng key mới để kiểm tra.
- Quyết định: migrate dữ liệu từ render_orders/jobs (Worker Fleet cũ) sang model MVP, hay giữ song song vĩnh viễn (cần business decision, có dữ liệu thật đang chạy: 12 jobs, 712 tasks).

---

# Risks

- (đã fix) MISMATCH schema — model MVP (customer_profiles/jobs.../review_images/downloads/worker_logs/notifications) đã tồn tại song song với model Worker Fleet cũ (render_orders/sites/tasks), không đụng tới cái cũ.
- Model Worker Fleet cũ (render_orders/tasks/workers/fleets) đang có dữ liệu thật đang chạy (12 jobs, 712 tasks tại thời điểm audit) — KHÔNG được xoá/migrate tự động, chỉ mở rộng thêm cột cần cho MVP.

---

# Blockers

- (đã hết truy cập Supabase — hiện đã có MCP access đầy đủ, không còn CLOUD_VERIFICATION_REQUIRED)

---

# Next Task

Đã kiểm tra `get_advisors(security)` sau khi apply migration 007: KHÔNG có ERROR nào (không còn bảng MVP nào thiếu RLS). Toàn bộ WARN còn lại (function_search_path_mutable, rls_policy_always_true trên remote_commands, anon/authenticated_security_definer_function_executable) đều thuộc các function/table Worker Fleet CŨ (create_task, claim_task, report_heartbeat, remote_commands...) — ngoài phạm vi MVP, KHÔNG được sửa (theo luật "không đụng Worker Fleet"). Trigger `handle_new_auth_user` của MVP tự set `search_path = public` nên không nằm trong danh sách WARN.

## 🚨 SECURITY INCIDENT (đã rotate)
`backend/.env.example` từng chứa secret thật (Supabase service_role key, B2 application key) bị commit công khai. Đã xóa khỏi working tree; secret cũ coi như đã lộ vĩnh viễn trong git history (không rewrite history). Cần xác nhận với người dùng rằng cả 2 secret (Supabase service_role, B2 application key `00483fb516ab3b10000000003`) đã được rotate trên dashboard tương ứng và biến môi trường Render đã cập nhật — CHƯA có xác nhận từ người dùng về việc đã rotate xong.

## RLS (đã bật, xem migration 007)
render_orders/payments/sites/machine_capability/customer_profiles/review_images/downloads/notifications đã bật RLS với policy owner-scoped (`auth.uid()`). payments/sites/machine_capability/storage_objects/worker_logs: bật RLS, không có policy — chỉ Backend (service_role) đọc/ghi được, đây là lựa chọn có chủ ý.

---

# Resume Instruction

Nếu người dùng chỉ nhắn:

tiếp

→ tiếp tục mục Pending đầu tiên.
