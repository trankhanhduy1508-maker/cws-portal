## MVP V2 Roadmap Sync (2026-08-04)

Đã tạo `CWS_ROADMAP_MVP_V2.md` và source reconciliation report từ V1, DECISIONS, PROJECT_CONTEXT, CWS_MVP_WORKFLOW_FINAL, CWS_WORKER_ROADMAP, toàn bộ `reports/customer/` và evidence/PR mới nhất trên GitHub.

V2 giữ nguyên V1 và không tính PR chưa merge vào trạng thái PASS. Các gap ưu tiên còn lại:

- Worker production path claim + B2 upload + Blender/Fleet E2E thật.
- Resume upload, early `.blend` validation, draft preservation và ẩn nguồn upload chưa hoạt động.
- Price estimate/breakdown/cap, live payment/recovery/refund policy.
- Retention/privacy/terms và support channel/ticket.
- Preview runtime/edit-request state.
- Admin MFA thật và xử lý job/payment/support bị kẹt.
- Full E2E và pilot khách thật.

**MVP V2 hiện chưa hoàn thành.** Các mục cần Owner được ghi rõ trong roadmap; không tự bịa giá, SLA, retention, refund, support hoặc customer metrics.

Evidence: `reports/CWS_MVP_V2_SOURCE_RECONCILIATION_2026-08-04.md`.

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
  Mở rộng thêm cùng ngày: bộ 10 test function-level offline
  (`reports/worker/worker_offline_function_tests.py`) - multi-frame,
  `enable_autoexec=False` (đường dẫn job khách upload), `render_single_frame()`,
  mã GPU fix chạy thật trong Blender, đường lỗi `.blend` không tồn tại,
  `validate_rendered_image()` trên ảnh corrupt/quá nhỏ,
  `extract_drive_file_id()`, `get_b2_client()` (khởi tạo client, không
  gọi API thật) - **11/11 PASS**, xem
  `reports/worker/WORKER_OFFLINE_FUNCTION_TESTS_2026-08-03.json`.
- **RPC `claim_task()`/`claim_next_generic_task()` verify THẬT trên
  Postgres production** (không phải chỉ đọc code) - test cô lập trong
  transaction luôn `ROLLBACK` (đã tự kiểm chứng cơ chế rollback trước),
  claim đúng task test, reject double-claim đúng, sau rollback xác
  nhận 6 job MVP thật (task 773-778) và tổng số dòng `jobs`/`tasks`
  hoàn toàn không đổi - không claim job production/Fleet thật nào. Xem
  `reports/worker/CWS_CLAIM_TASK_RPC_ISOLATED_TEST_2026-08-03.md`.
- **Gỡ blocker "không có Node.js/npm"** (đã chặn build/test TypeScript
  nhiều phiên trước) - tự động hoá bằng
  `reports/dev/setup_node_runtime_test.ps1` (idempotent, version Node
  22.23.2 lấy từ `.github/workflows/ci.yml` + nodejs.org index thật,
  không đoán). Chạy đúng 4 bước CI cho backend
  (`npm ci`/`build`/`test`/`lint`) - **117/117 Jest test PASS** (đã
  xác nhận trước toàn bộ test mock hoàn toàn, không đụng Supabase/B2
  thật) - và 3 bước cho frontend (`npm ci`/`build`/`lint`, chưa có file
  test frontend nào nên bỏ qua `npm test`) - **PASS toàn bộ**. Xem
  `reports/dev/CWS_NODE_BUILD_TEST_2026-08-03.md`.
- **Payment reconciliation wire vào Admin Dashboard** (đúng bước tiếp
  theo đã chốt sẵn trong DECISIONS.md khi có môi trường build) - `GET
  /payments/reconciliation-anomalies` (RoleGuard admin-only) đọc thẳng
  view `payment_reconciliation_anomalies`, không viết lại logic;
  `AdminScreen.jsx` thêm bảng mới ngay sau bảng Job. Verify: (a)
  read-only production thật xác nhận đúng 1 bất thường đã biết, (b)
  build+117/117 test+lint PASS (chạy trước khi dọn lại diff do
  `eslint --fix` reformat hàng loạt file không liên quan - đã dọn,
  diff cuối chỉ còn đúng phần thêm mới). LƯU Ý: sau bước dọn diff, máy
  gặp sự cố môi trường (mọi lệnh `node.exe` mới bị treo vô thời hạn,
  nghi phần mềm quản lý máy chặn) nên KHÔNG re-run được lần cuối - độ
  tin cậy dựa trên diff byte-for-byte giống hệt lần đã PASS. Xem
  `reports/payments/CWS_PAYMENT_RECONCILIATION_DASHBOARD_WIRING_2026-08-03.md`.

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

## Latest Audit Loop — 2026-08-04

Đã sửa GAP nguồn file không trung thực: `UploadScreen`, `GoogleDriveModal`, `fileUtils` và `renderConstants` hiện chỉ quảng bá/validate Google Drive cho nguồn link; upload trực tiếp `.blend` vẫn được giữ. OneDrive/Dropbox/Direct Link chưa có Backend resolver thật nên không còn được nhận ở UI. Evidence: `reports/CWS_UPLOAD_SOURCE_TRUTH_EVIDENCE_2026-08-04.md`.

Đây là PASS ở mức code/static consistency, chưa phải Full E2E production. Upload resume, `.blend` inspection sâu, OAuth draft persistence, Worker/B2 runtime và Full E2E vẫn còn.

## P0 Security Audit Loop — 2026-08-04

Đã audit RoleGuard/RBAC, customer ownership, WebSocket owner check, Host worker filtering, B2 signed URL, RLS, file intake, logs và legacy admin-key paths.

Đã code trên branch hiện tại:

- POST /jobs, POST /files/upload, POST /drive/resolve yêu cầu Supabase Bearer customer hợp lệ.
- Job không có customer_id hoặc không khớp customer token bị từ chối ở JobsService.assertOwnership.
- GET /jobs/:id/logs yêu cầu Admin RoleGuard + MFA; customer không còn đọc worker logs.
- Host dashboard tiếp tục lọc theo staff_worker_access; Fleet/Admin routes dùng RoleGuard backend.
- Existing RLS, signed URL TTL và WebSocket owner checks được giữ và ghi nhận trong evidence.

Payment detail ownership cũng đã được khóa: direct unauthenticated payment creation bị gỡ khỏi controller; GET payment yêu cầu customer Bearer và đối chiếu owner qua render_orders.customer_id.

Trạng thái: **CODE PASS / RUNTIME CHƯA XÁC MINH**. Cần chạy Jest/build và kiểm thử bằng hai tài khoản thật để chuyển P0 sang runtime PASS.

RLS P0 fix: added backend/migrations/016_enable_customer_rls_boundaries.sql to explicitly enable RLS on customer and internal tables without deleting data/policies.

Upload safety fix: direct .blend intake now rejects renamed/non-native files missing the BLENDER signature before B2 upload; focused unit tests were added. Upload UI cũng hiển thị công khai giới hạn `.blend` only, 2GB và Google Drive-only link source trước khi khách tiếp tục. Progress UI hiển thị queue delay từ `queueSeconds` khi Backend trả về. Upload draft `.blend` được lưu tạm IndexedDB qua OAuth redirect và khôi phục sau login; không lưu credential/token. Worker frame timeout đã được thêm vào `cws_worker_full.py` qua `CWS_FRAME_TIMEOUT_SEC`, kèm cleanup output khi timeout.

Evidence: reports/customer/CWS_BLEND_EARLY_VALIDATION_2026-08-04.md.

Evidence: reports/security/CWS_P0_BOUNDARY_AUDIT_2026-08-04.md.

## Last Verified (bổ sung)

2026-08-03 (tiếp tục LOOP sau khi Owner tạo B2 key mới): ReviewScreen
làm rõ "Yêu cầu chỉnh sửa miễn phí, không giới hạn" — xác nhận đúng
hành vi backend thật (`JobsService.requestChanges` không có logic
phí/giới hạn nào), không phải chính sách bịa ra. Đã rà soát thêm các
MUST HAVE khác trong Customer Research 300 (cảnh báo file quá lớn
trước upload, kiểm tra sớm file — `MAX_FILE_SIZE_BYTES`/`validateFile`)
— **đã có sẵn trong code từ trước**, không cần sửa.

## Current Task

Autonomous LOOP (Owner uỷ quyền 2026-08-03) vừa hoàn tất một chuỗi
việc độc lập trên một máy Windows có PowerShell + mạng: (1) tự động
hoá chuẩn bị + verify runtime Worker (Python 3.12.7 + Blender 5.2.0),
(2) verify RPC `claim_task()`/`claim_next_generic_task()` thật trên
Postgres production theo cách cô lập an toàn tuyệt đối, (3) **gỡ hẳn
blocker "không có Node.js/npm"** đã chặn nhiều phiên trước - môi
trường này giờ CÓ THỂ tự tải/cài Python+Blender+Node.js portable
(không cần Admin/installer tay) và tự `build`/`test`/`lint` cả backend
(NestJS)/frontend (Vite) — xem mục Last Verified phía trên. Do đó
Definition of Done (AGENTS.md, "không lỗi build") giờ CÓ THỂ tự xác
minh cho thay đổi TypeScript mới, nhưng phiên này CHƯA mở thay đổi
TypeScript mới nào (chỉ verify blocker đã gỡ) - các mục Next bên dưới
(payment/refund safety net...) vẫn còn nguyên, giờ không còn bị chặn
bởi thiếu công cụ. Trước đó dừng ở điểm B sau 2 fix: (1) P0 Worker
generic job claim + `--enable-autoexec` gating, (2) gỡ nút "Hủy job"
gây hiểu lầm ở PaymentScreen (Customer Research 300, mục C2.7) — vẫn
giữ nguyên.

## Next

1. **B2 credential rotate** — BLOCKED, cần Owner (xem
   `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md` mục 3): key
   hardcode hiện tại trong git repo test thật trả 401 Unauthorized từ
   Backblaze, cần Owner xác nhận key thật đang chạy trên Fleet.
2. **Runtime verify Worker generic claim** — THÊM UNBLOCKED 2026-08-03:
   ngoài pipeline render (mục Last Verified), RPC `claim_task()`/
   `claim_next_generic_task()` (migration 014, P0 fix) đã verify THẬT
   trên chính Postgres production - test trong transaction luôn
   ROLLBACK (đã tự kiểm chứng cơ chế rollback trước khi test), claim
   đúng task test cô lập, reject double-claim đúng, và xác nhận SAU
   ROLLBACK 6 job MVP thật (task 773-778) hoàn toàn nguyên trạng
   (queued/chưa ai claim), tổng số dòng `jobs`/`tasks` không đổi (17/717)
   - **tuyệt đối không claim job production/Fleet thật**. Xem
   `reports/worker/CWS_CLAIM_TASK_RPC_ISOLATED_TEST_2026-08-03.md`.
   Còn lại BLOCKED, cần Owner: (a) end-to-end thật từ chính
   `cws_worker_full.py` (gọi RPC qua HTTP, không phải SQL trực tiếp)
   claim 1 job Portal thật — cần quyết định thời điểm/job cụ thể vì
   bắt buộc claim thật; (b) B2 upload thật — key mới Owner vừa tạo
   **CHƯA có trong environment của máy test này** (đã kiểm tra
   `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` cả User-scope lẫn process, không
   thấy) — cần Owner tự chạy `reports/worker/setup_b2_worker_credential.ps1`
   trên máy đó (nhập key qua prompt bảo mật, không dán qua chat) trước
   khi có thể tự động verify tiếp; (c) máy Fleet vật lý thật (GPU/
   driver/diskless BootROM thật) để verify hoàn toàn.
3. **Payment/refund safety net cho Admin** — DONE 2026-08-03 (view wire
   vào Admin Dashboard, xem mục Last Verified). Còn lại BỔ SUNG (chưa
   chốt yêu cầu, không thuộc phạm vi quyết định gốc): hành động
   remediation (vd nút "đánh dấu đã xử lý" cho notification kẹt) —
   hiện tại Admin CHỈ xem được, chưa có nút thao tác trên các bất
   thường này, vì DECISIONS.md gốc chỉ yêu cầu "phát hiện", chưa yêu
   cầu "xử lý tự động qua Dashboard".
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


## Edit Request State — 2026-08-04

Đã hoàn thiện gap P1 về yêu cầu chỉnh sửa: migration 017 + repository/service lưu trạng thái REQUESTED, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, DECLINED, người xử lý và thời gian phản hồi dự kiến. Customer đọc qua GET /jobs/:id/edit-requests sau ownership check; Admin xem/cập nhật qua /staff/edit-requests với RoleGuard + MFA backend. RLS chỉ cho customer đọc request của chính mình. Evidence: reports/security/CWS_EDIT_REQUEST_STATE_2026-08-04.md; contract test: backend/src/security/p0-boundary.contract.spec.ts. Trạng thái: CODE/TEST PASS, runtime hai tài khoản/MFA chưa xác minh.


## CI Verification — 2026-08-04

GitHub Actions run #202 (head a1dbffe) PASS: Backend build + 18 Jest suites/123 tests, Frontend build + lint. Đây là evidence code/build/test; chưa thay thế runtime hai tài khoản, RLS/MFA thật, Worker/B2 vật lý hoặc Full E2E. Chi tiết: reports/CWS_CI_VERIFICATION_2026-08-04.md.

Latest CI recheck: GitHub Actions run #204 (head 750916c) PASS sau khi chỉnh comment auth controller; backend build/test và frontend build/lint đều PASS.


## Resumable Upload — 2026-08-04

Đã thay upload một lần bằng B2 multipart: chunk 8MiB, session/ETag lưu Supabase, customer ownership + RLS, resume qua sessionStorage, kiểm tra BLENDER header ở chunk đầu, và cleanup session ACTIVE quá 24 giờ. CI #215 PASS (backend build/tests, frontend build/lint). Runtime mất mạng/resume trên B2 thật và browser quota chưa xác minh. Evidence: reports/customer/CWS_RESUMABLE_UPLOAD_2026-08-04.md.
