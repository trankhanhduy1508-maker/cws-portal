# Current Status

> Entry point đầu tiên của LOOP (AGENTS.md — Source-of-Truth Sync).
> File này CHỈ ghi trạng thái mới nhất, không phải lịch sử. Chi tiết
> bằng chứng nằm trong `reports/` (link ở mục Last Updated).

## Current Phase

Giai đoạn 5-6 (Thanh toán + Bàn giao) — cơ chế DONE (Sandbox/HTTP thật).
Giai đoạn 2-4 (Luồng khách hàng → Render → Preview) — NEEDS_VERIFICATION,
chưa có 1 job thật chạy hết chuỗi liên tục. Xem chi tiết từng hạng mục:
`CWS_ROADMAP_MVP_V1.md`.

## Last Verified

2026-08-02 — SePay Test Mode/Sandbox webhook (E2E thật, DB confirmed) +
PAID → B2 Signed URL → Download (HTTP thật tới production, ownership
check + audit log confirmed). Chi tiết:
`reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md`,
`reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md`.

## Current Task

Task 1 (Owner uỷ quyền) — audit Worker `.bat`/`.py` thật trong repo
HOÀN TẤT. Kết quả: `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`.
Đã STOP theo đúng yêu cầu, chờ Owner xác nhận trước khi làm gì tiếp
(kể cả Task 2 — Admin MFA — CHƯA bắt đầu).

## Next

LOOP phát triển feature vẫn **tạm dừng** — chờ Owner xác nhận. Việc cần
quyết định trước khi tiếp tục, theo thứ tự ưu tiên:

1. **Worker hiện tại KHÔNG claim được job MVP chung** (hardcode 1 danh
   sách `job_id` cố định cho công việc riêng của Owner) — cần Owner
   quyết định hướng trước khi Giai đoạn 3 (Render) có thể tiến thêm.
   Chi tiết: `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` mục 2.1.
2. Phát hiện bảo mật: B2 key đầy đủ quyền hardcode plaintext trong
   `cws_worker_full.py` (mục 2.5 report trên) — cần Owner tạo key mới
   giới hạn quyền trước khi mở rộng Fleet.
3. Full MVP Core Flow chưa đạt điểm dừng E2E — cần Owner tự chạy 1 job
   thật qua UI HOẶC cung cấp máy Worker vật lý. Chi tiết:
   `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`.
4. Task 2 (Admin MFA/TOTP) — chưa bắt đầu, chờ xác nhận LOOP tiếp tục.

## Last Updated

2026-08-02 — xem `reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`
(Task 1), `reports/SOURCE_OF_TRUTH_RECONCILIATION_2026-08-02.md` cho
reconciliation, `reports/CURRENT_STATUS_ARCHIVE_2026-08-02.md` cho lịch
sử đầy đủ trước khi file này được rút gọn.
