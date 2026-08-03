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

2026-08-03 (bổ sung sau, runtime Worker):
- **Worker runtime (Python 3.12.7 + Blender 5.2.0) verify THẬT lần đầu
  tiên** trên một máy Windows thật (không phải Fleet vật lý đối tác) -
  tự động hoá toàn bộ bằng `reports/worker/setup_worker_runtime_test.ps1`
  (idempotent, tự đọc version từ Source of Truth trong code, không
  đoán). Gọi thẳng hàm sản xuất thật `render_frame_range()` (đúng cách
  Blender được gọi trong production: `--enable-autoexec`, `-s/-e/-a`)
  trên 1 scene Blender mặc định - render + `validate_rendered_image()`
  PASS thật (1.8s/frame). Có chủ đích KHÔNG gọi `claim_task()`/
  `claim_next_generic_task()`/upload B2 thật để không ảnh hưởng Fleet
  production đang hoạt động. Đổi trạng thái Worker từ "CODE
  VERIFIED/RUNTIME NOT VERIFIED" sang "CODE + RENDER PIPELINE RUNTIME
  VERIFIED, CLAIM+UPLOAD THẬT VẪN CHƯA VERIFY" - xem
  `reports/worker/CWS_WORKER_RUNTIME_TEST_2026-08-03.md` và
  `reports/worker/WORKER_RUNTIME_TEST_EVIDENCE_2026-08-03.json`.

2026-08-03:
- **Payment reconciliation view** (`payment_reconciliation_anomalies`,
  migration 015, áp dụng thật lên production, đã query xác nhận) — CHỈ
  ĐỌC, phát hiện 3 loại bất thường thanh toán chưa từng có cảnh báo tự
  động: payment_status lệch khỏi bảng payments thật, webhook kẹt
  'processing' >10 phút, đã thanh toán thật >2 tiếng nhưng chưa nhận
  file. Query xác nhận đúng 1 bất thường đã biết (order `00189232-...`,
  xem `reports/payments/CWS_PAID_ORPHAN_ORDER_FINDING_2026-08-03.md`),
  không phát sinh thêm — Admin dùng ngay qua Supabase SQL Editor
  (`select * from payment_reconciliation_anomalies;`) cho tới khi có
  môi trường build để wire vào Admin Dashboard.
- **B2 credential hết hardcode hoàn toàn** trong `cws_worker_full.py`
  (không còn fallback nào, kể cả key chết) — bắt buộc đọc
  `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` từ env, set cục bộ qua `cws_worker.bat`
  trên từng máy. Audit least-privilege xác nhận scope tối thiểu cần
  thiết thật (bucket `MTEB90`, prefix `renders/`, Read+Write, không cần
  delete/quản lý bucket) — Owner đã tạo key mới đúng scope này. Xem
  `reports/worker/CWS_B2_LEAST_PRIVILEGE_AUDIT_2026-08-03.md`.
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

## Last Verified (bổ sung)

2026-08-03 (tiếp tục LOOP sau khi Owner tạo B2 key mới): ReviewScreen
làm rõ "Yêu cầu chỉnh sửa miễn phí, không giới hạn" — xác nhận đúng
hành vi backend thật (`JobsService.requestChanges` không có logic
phí/giới hạn nào), không phải chính sách bịa ra. Đã rà soát thêm các
MUST HAVE khác trong Customer Research 300 (cảnh báo file quá lớn
trước upload, kiểm tra sớm file — `MAX_FILE_SIZE_BYTES`/`validateFile`)
— **đã có sẵn trong code từ trước**, không cần sửa.

## Current Task

Autonomous LOOP (Owner uỷ quyền 2026-08-03) vừa hoàn tất thêm 1 nhánh
việc độc lập: tự động hoá chuẩn bị + verify runtime Worker (Python
3.12.7 + Blender 5.2.0, xem mục Last Verified phía trên) trên một máy
Windows có PowerShell + mạng — môi trường này CÓ THỂ tự tải/cài
Python+Blender portable (không cần Admin/installer tay), nhưng **vẫn
KHÔNG có Node.js/npm** (đã xác nhận lại 2026-08-03) — vẫn không thể
`build`/`test`/`lint` bất kỳ thay đổi backend (NestJS)/frontend (Vite)
nào, nên vẫn không tự mở thêm thay đổi TypeScript mới (vd surfacing
payment_notifications kẹt cho Admin) mà không có công cụ xác minh
"không lỗi build" theo đúng Definition of Done (AGENTS.md). Trước đó
dừng ở điểm B sau 2 fix: (1) P0 Worker generic job claim +
`--enable-autoexec` gating, (2) gỡ nút "Hủy job" gây hiểu lầm ở
PaymentScreen (Customer Research 300, mục C2.7) — vẫn giữ nguyên,
chưa có thay đổi TypeScript mới nào trong phiên này.

## Next

1. **B2 credential rotate** — BLOCKED, cần Owner (xem
   `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md` mục 3): key
   hardcode hiện tại trong git repo test thật trả 401 Unauthorized từ
   Backblaze, cần Owner xác nhận key thật đang chạy trên Fleet.
2. **Runtime verify Worker generic claim** — MỘT PHẦN UNBLOCKED
   2026-08-03: pipeline render (Blender headless + validate ảnh) đã
   verify thật trên máy Windows có Python+Blender (xem mục Last
   Verified). Còn lại BLOCKED, cần Owner: (a) test `claim_task()`/
   `claim_next_generic_task()` thật trên Supabase — sẽ claim job thật,
   cần quyết định thời điểm/job test riêng; (b) B2 upload thật — cần
   key mới hợp lệ (key cũ trả 401, xem mục 1); (c) máy Fleet vật lý
   thật (GPU/driver/diskless BootROM thật) để verify hoàn toàn.
3. **Payment/refund safety net cho Admin (payment_notifications kẹt
   'processing', PAID nhưng chưa finalize)** — cần môi trường có
   Node/npm để build+test backend an toàn trước khi push (không có
   trong lần chạy này).
4. **Admin MFA cần Owner tạo 1 tài khoản staff thật + tự quét QR** —
   checklist 4 bước trong
   `reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` mục 5.
5. **Full MVP Core Flow chưa đạt điểm dừng A** — cần Owner tự chạy 1
   job thật qua UI HOẶC cung cấp máy Worker vật lý. Chi tiết:
   `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`.

## Last Updated

2026-08-03 — xem `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`
(P0 fix mới nhất, commit `109d258`), commit `27a10f4` (PaymentScreen
UX fix), `reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`
(ưu tiên hoá task theo insight khách hàng),
`reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` (Admin MFA),
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` (Worker
audit gốc), `reports/CURRENT_STATUS_ARCHIVE_2026-08-02.md` (lịch sử
đầy đủ trước khi file này được rút gọn).
