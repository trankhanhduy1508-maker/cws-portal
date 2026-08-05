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

## Customer Google Login Regression — 2026-08-05

- Root cause: production cũ thiếu Supabase public config; Customer UI redesign commit `95b1382` không làm đổi OAuth helper.
- PR #17 đã merge thành `9d2d223`; Vercel production deployment `dpl_CLb4MZErFT3rbNUspiAEUQuNqvRa` READY và alias `cws-portal.vercel.app` đang chạy commit này.
- Production bundle có Supabase URL/OAuth; HTTP authorize test thật trả 302 tới Google với production redirect.
- Callback/session restore bằng tài khoản Google thật: NEEDS_VERIFICATION vì môi trường này không có browser automation/tài khoản tương tác.
- Evidence: `reports/evidence/CWS_CUSTOMER_GOOGLE_LOGIN_REGRESSION_2026-08-04.md`.

## Worker + Node Agent VIBE CODE — 2026-08-05

- Created `docs/worker-node-agent/README.md`, `WORKER_VIBE_CODE.md` and `NODE_AGENT_VIBE_CODE.md` as the canonical long-lived context.
- Added `worker/node_agent.py`: deterministic ACTIVE_IDLE/prepare/start/run/recovery/cleanup state machine.
- Offline Windows test: 6/6 PASS. Evidence: `reports/worker/CWS_NODE_AGENT_STATE_MACHINE_2026-08-05.md`.
- Status: UNIT VERIFIED only. Physical Blender/B2, real lease/heartbeat, isolation and multi-node failover remain NEEDS_VERIFICATION/HUMAN BLOCKER.

## Last Updated

2026-08-03 — xem `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`
(P0 fix mới nhất, commit `109d258`), commit `27a10f4` (PaymentScreen
UX fix), `reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`
(ưu tiên hoá task theo insight khách hàng),
`reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` (Admin MFA),
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` (Worker
audit gốc), `reports/CURRENT_STATUS_ARCHIVE_2026-08-02.md` (lịch sử
đầy đủ trước khi file này được rút gọn).


## Worker + Node Agent VIBE loop — 2026-08-05

- Canonical Worker on main verified: `cws_worker_full.py` (blob `e3b0872c2236e47849ec6450532eab18018b129f`) + `cws_worker.bat` (blob `11f71e049358fe7d35b992b0a89fde9d600638b6`). Older report names are not treated as current package artifacts.
- Added `worker/canonical_worker_launcher.py`: manifest version/direct-child path/SHA-256 validation before explicit launch; no pip bootstrap, no second supervisor, no power API.
- Offline verification: Node Agent + launcher suite **9/9 PASS** and py_compile PASS. Evidence: `reports/worker/CWS_WORKER_NODE_AGENT_LOOP_2026-08-05.md`.
- Added exact staging procedure: `reports/worker/CWS_WORKER_STAGING_PROCEDURE_1_18_0.md`.
- Status remains **UNIT/CODE VERIFIED only**. Blender CLI, `--disable-autoexec`, B2 checkpoint, real lease/heartbeat, Windows isolation and two-node failover are not claimed PASS.
- OWNER TODO: run the staging procedure on a real Windows staging node with a harmless `.blend` and scoped staging B2 credential; do not provide secrets in chat.


## Worker + Node Agent → Admin fleet visibility — 2026-08-05

- Added backend derivation of Node Agent authority in `GET /fleet/workers`: fresh heartbeat + stopped Worker remains ONLINE/ACTIVE_IDLE; stale heartbeat (>180s) becomes OFFLINE; lifecycle states map to PREPARING/BUSY/RECOVERY.
- Admin Worker table now shows PC/Node state, Worker state, current Job, last seen and health.
- Fixed production Admin route: `vercel.json` SPA rewrite plus `/admin` pathname guard; prior read-only check returned Vercel NOT_FOUND before this change.
- Tests: targeted state 3/3 PASS, backend build PASS, frontend build/lint/tests PASS (6/6). Live Vercel deploy, Admin MFA session and real Node Agent heartbeat remain UNVERIFIED.
- Evidence: `reports/worker/CWS_NODE_AGENT_ADMIN_FLEET_VISIBILITY_2026-08-05.md`.


## Production Admin/Fleet verification — 2026-08-05 follow-up

- Vercel canonical project remains `cws-portal`; latest READY production deployment observed is commit `13cf7ed`, before later Admin route/fleet commits. Direct deployment tool requires file upload; local `dist` contains non-deployable internal documents, so no unsafe upload was performed.
- Production `/admin` remains 404 until a clean deployment containing `vercel.json` and pathname guard is created.
- Read-only Windows process check found no running Node Agent/cws_worker/Blender process; no fake heartbeat or Supabase mutation was performed.
- Real Node Agent → Supabase → Admin E2E is BLOCKED/UNVERIFIED pending clean Vercel deployment, real staging Agent process and Admin AAL2 session.
- Evidence: `reports/worker/CWS_NODE_AGENT_ADMIN_FLEET_VISIBILITY_2026-08-05.md`.


## Worker + Node Agent lifecycle hardening — 2026-08-05

- Added explicit Node Agent transition reasons and injected runtime policy.
- Added bounded, non-blocking exponential retry backoff; retry readiness does not block heartbeat/poll loops.
- Added safe monitor-off/on boundary hooks for ACTIVE_IDLE; no Sleep/Hibernate/shutdown/logoff or power API is called.
- Verification: Python py_compile PASS; combined offline suite **11/11 PASS**.
- Evidence: `reports/worker/CWS_NODE_AGENT_LIFECYCLE_HARDENING_2026-08-05.md`.
- Still **UNIT/CODE VERIFIED only**: no physical Node Agent/Worker/Blender process is running on the current machine; Vercel fleet revision is not deployed; real heartbeat, B2, ACL/isolation, crash/timeout runtime and multi-node failover remain BLOCKED/UNVERIFIED.

## Windows staging verification — 2026-08-05

- Python 3.12.7 and Blender 5.2.0 LTS were runtime-verified on this Windows machine using a harmless factory-startup scene, disable-autoexec, exit code 0, non-empty PNG and SHA-256 output check.
- Supabase REST endpoint was reachable read-only but unauthenticated probe returned HTTP 401; no production RPC or heartbeat mutation was attempted.
- Canonical Worker spawn is BLOCKED: current Windows checkout does not contain cws_worker_full.py and its local manifest is an older artifact schema.
- B2 read-only is BLOCKED: User-scope B2 configuration was loaded only into a child process for a list test and returned HTTP 401; no upload/download/delete was attempted.
- Real Node Agent heartbeat, canonical Worker completion, B2 checkpoint, cleanup and monitor-off remain BLOCKED/UNVERIFIED.
- Evidence: reports/worker/CWS_WINDOWS_STAGING_VERIFICATION_2026-08-05.md.


## Generic Worker Engine architecture correction — 2026-08-05

- Legacy cws_worker_full.py đã được đọc như knowledge/evidence; không restore và không dùng làm dependency.
- Đã thêm generic data-driven engine worker/worker_engine.py và 4 test offline PASS.
- Engine nhận JobSpec động, bắt buộc customer autoexec false, có job-scoped workspace, per-frame checkpoint/resume boundary, output validation và cleanup.
- Job mới không yêu cầu sửa Python hoặc update fleet.
- Chưa có Backend/Node Agent production adapter, canonical package staging hoặc B2/Supabase integration runtime; status CODE/UNIT VERIFIED בלבד.
- Evidence: reports/worker/CWS_WORKER_LEGACY_SALVAGE_MATRIX_2026-08-05.md.


## Generic Worker Engine correction — 2026-08-05

Legacy `cws_worker_full.py`/`cws_worker.bat` are retained as reference-only sources after salvage review; excluded from runtime package and never imported/launched. Generic Engine `worker/worker_engine.py` is data-driven and receives JobSpec per attempt; no per-job Worker update is required. Offline Worker/Node suite: 17/17 PASS.
