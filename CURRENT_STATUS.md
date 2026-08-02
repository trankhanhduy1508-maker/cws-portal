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

Nâng cấp cơ chế Source-of-Truth (AGENTS.md/Roadmap/DECISIONS.md) +
reconciliation audit toàn bộ docs so với code/tests/evidence thật.
Chi tiết: `reports/SOURCE_OF_TRUTH_RECONCILIATION_2026-08-02.md`.

## Next

LOOP phát triển feature đang **tạm dừng theo yêu cầu Owner** — chờ Owner
xác nhận trước khi tiếp tục. Khi tiếp tục, 2 hướng đã xác định:

1. Full MVP Core Flow chưa đạt điểm dừng E2E — cần Owner tự chạy 1 job
   thật qua UI (đăng nhập thật) HOẶC cung cấp máy Worker vật lý
   (Windows + Python + Blender). Chi tiết:
   `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`.
2. 2 task ưu tiên Owner đã nêu (đang chờ xác nhận LOOP tiếp tục để bắt
   đầu): (a) audit Worker `.bat`/`.py` thật trong repo xem đã sẵn sàng
   chạy trên Windows+Python+Blender hay chưa; (b) nâng cấp bảo mật
   Admin Dashboard (Giai đoạn 7) lên MFA/TOTP, backend enforce
   authorization đầy đủ (không chỉ chặn ở frontend route).

## Last Updated

2026-08-02 — xem `reports/SOURCE_OF_TRUTH_RECONCILIATION_2026-08-02.md`
cho chi tiết reconciliation, `reports/CURRENT_STATUS_ARCHIVE_2026-08-02.md`
cho lịch sử đầy đủ trước khi file này được rút gọn.
