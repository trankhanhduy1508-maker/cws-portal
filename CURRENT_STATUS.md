# Current Status

> Entry point đầu tiên của LOOP (AGENTS.md — Source-of-Truth Sync).
> File này CHỈ ghi trạng thái mới nhất, không phải lịch sử. Chi tiết
> bằng chứng nằm trong `reports/` (link ở mục Last Updated).

## Current Phase

Autonomous LOOP đang chạy (Owner uỷ quyền 2026-08-02, không dừng giữa
chừng). Giai đoạn 5-7 (Thanh toán, Bàn giao, Trang quản trị) — DONE ở
mức code/test/HTTP thật. Giai đoạn 2-4 (Luồng khách hàng → Render →
Preview) — NEEDS_VERIFICATION, chưa có 1 job thật chạy hết chuỗi liên
tục, phụ thuộc máy Worker vật lý (xem Next).

## Last Verified

2026-08-02:
- SePay Test Mode/Sandbox webhook (E2E thật, DB confirmed).
- PAID → B2 Signed URL → Download (HTTP thật tới production).
- Audit Worker `.bat`/`.py` thật (code, không phải runtime vật lý).
- **Admin Portal MFA/TOTP** (RoleGuard bỏ x-admin-key bypass, bắt buộc
  Supabase Auth MFA chính thức, 114/114 backend test PASS, frontend
  build sạch) — HUMAN_VERIFICATION_PENDING cho lần đăng nhập thật đầu
  tiên (chưa có tài khoản staff nào tồn tại để tự test).

Chi tiết: `reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md`,
`reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md`,
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`,
`reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md`.

## Current Task

Autonomous LOOP: đã hoàn tất Admin Portal MFA (độc lập, không cần
Owner). Đang đánh giá các task độc lập còn lại trước khi kết luận điểm
dừng B (xem `reports/` mới nhất để biết chi tiết).

## Next

Các phần ĐỘC LẬP còn lại đã được đánh giá — TẤT CẢ đều phụ thuộc hành
động/quyền/thiết bị của Owner (điểm dừng B, không phải A):

1. **Worker KHÔNG claim được job MVP chung** (hardcode `job_id` riêng)
   + **B2 key đầy đủ quyền hardcode plaintext** + **`--enable-autoexec`
   chỉ an toàn khi Owner tự chọn file** — cả 3 đều là quyết định kiến
   trúc/vận hành cần Owner xác nhận trước khi sửa (code đang chạy thật
   trên máy Fleet, không thể tự sửa mù + không thể test/regression
   trong môi trường agent). Chi tiết:
   `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`.
2. **Admin MFA cần Owner tạo 1 tài khoản staff thật + tự quét QR** để
   xác nhận runtime — checklist 4 bước trong
   `reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` mục 5.
3. **Full MVP Core Flow chưa đạt điểm dừng A** — cần Owner tự chạy 1
   job thật qua UI HOẶC cung cấp máy Worker vật lý. Chi tiết:
   `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`.

## Last Updated

2026-08-02 — xem `reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md`
(Admin MFA, mới nhất), `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`
(Worker audit), `reports/SOURCE_OF_TRUTH_RECONCILIATION_2026-08-02.md`
(reconciliation), `reports/CURRENT_STATUS_ARCHIVE_2026-08-02.md` (lịch
sử đầy đủ trước khi file này được rút gọn).
