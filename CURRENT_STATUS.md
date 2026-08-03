# Current Status

> Entry point đầu tiên của LOOP (AGENTS.md — Source-of-Truth Sync).
> File này CHỈ ghi trạng thái mới nhất, không phải lịch sử. Chi tiết
> bằng chứng nằm trong `reports/` (link ở mục Last Updated).

## Current Phase

Autonomous LOOP đang chạy (Owner uỷ quyền 2026-08-02 và 2026-08-03,
không dừng giữa chừng). Giai đoạn 5-7 (Thanh toán, Bàn giao, Trang
quản trị) — DONE ở mức code/test/HTTP thật. Giai đoạn 2-4 (Luồng khách
hàng → Render → Preview) — NEEDS_VERIFICATION: 2 blocker P0 (Worker
không claim job MVP chung, `--enable-autoexec` không an toàn cho khách)
đã fix ở mức code + DB evidence thật 2026-08-03; chỉ còn thiếu máy
Worker Windows+Blender vật lý để verify runtime (xem Next).

## Last Verified

2026-08-03:
- **P0 fix: Worker generic job claim + `--enable-autoexec` gating**
  (migration 014 áp dụng thật lên production, claim+revert thành công
  trên 1 trong 6 job MVP thật đang chờ từ 2026-07-27; code Worker sửa,
  CODE VERIFIED/RUNTIME NOT VERIFIED vì không có máy Blender thật) —
  `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`.
- B2 credential trong `cws_worker_full.py` **test thật, xác nhận 401
  Unauthorized** từ Backblaze — key hardcode trong git repo không còn
  hợp lệ, cần Owner xác nhận key thật đang chạy trên Fleet + rotate.

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

Autonomous LOOP (Owner uỷ quyền 2026-08-03, tiếp tục không dừng giữa
chừng): đã fix P0 Worker generic job claim + `--enable-autoexec`. Đang
tiếp tục rà soát Customer Objection & Desire Research 300
(`reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`) để
ưu tiên: payment/refund safety net, output delivery, các MUST HAVE còn
lại có thể tự làm không cần Owner.

## Next

1. **B2 credential rotate** — BLOCKED, cần Owner (xem
   `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md` mục 3): key
   hardcode hiện tại trong git repo test thật trả 401 Unauthorized từ
   Backblaze, cần Owner xác nhận key thật đang chạy trên Fleet.
2. **Runtime verify Worker generic claim** — BLOCKED, cần máy
   Windows+Python+Blender vật lý (không có trong môi trường agent).
3. **Admin MFA cần Owner tạo 1 tài khoản staff thật + tự quét QR** —
   checklist 4 bước trong
   `reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` mục 5.
4. **Full MVP Core Flow chưa đạt điểm dừng A** — cần Owner tự chạy 1
   job thật qua UI HOẶC cung cấp máy Worker vật lý. Chi tiết:
   `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`.

## Last Updated

2026-08-03 — xem `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`
(P0 fix mới nhất), `reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`
(ưu tiên hoá task theo insight khách hàng),
`reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` (Admin MFA),
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` (Worker
audit gốc), `reports/CURRENT_STATUS_ARCHIVE_2026-08-02.md` (lịch sử
đầy đủ trước khi file này được rút gọn).
