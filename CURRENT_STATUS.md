# Current Status

## Production NO-GO remediation continuation — 2026-08-05

- CORS: **REAL RUNTIME VERIFIED** after Founder set `CORS_ORIGINS=https://cws-portal.vercel.app`; `/health` 200 and production preflight 204 with exact allow-origin, no credential grant. Evidence: `reports/security/CWS_RENDER_CORS_CRASH_2026-08-06.md`.
- CORS request-origin callback: **CODE/UNIT + PRODUCTION VERIFIED** for canonical allow; negative-origin matrix remains code/unit verified.
- Secret rotation readiness: **CODE/UNIT VERIFIED**; legacy helper fallback removed and rotation order documented without values. Actual production rotation remains **BLOCKED** on Owner action.
- Production RPC: migration 019 is idempotent and **CODE/UNIT VERIFIED** on staging; production remains unchanged. Worker publishable RPC identity/authentication remains **BLOCKED** for production.
- Admin AAL2: staging schema/RLS/RPC metadata **CODE/UNIT VERIFIED**; real Admin identity/TOTP and state matrix remain **BLOCKED** pending Owner enrollment.
- Admin authentication update 2026-08-06: Google OAuth + Supabase TOTP flow is **CODE/UNIT VERIFIED**; backend pre-MFA staff check is non-sensitive and all Admin data routes still require role + `aal2`. Current Render `/staff/mfa-status` returns HTTP 401 without credentials, confirming the route is live; real Google/TOTP/AAL2 session remains unverified.
- Windows SCM: Node Agent service PoC **REAL RUNTIME VERIFIED** for install/start/heartbeat/stop/restart/remove; GPU Worker remains a user-session helper boundary.
- Job Object: timeout/child cleanup **REAL RUNTIME VERIFIED**; Generic Worker renderer ownership is **CODE/UNIT VERIFIED** behind staging opt-in, while live Windows integration and full sandbox boundary remain **UNVERIFIED**.
- Path boundary: symlink rejection **CODE/UNIT VERIFIED**; junction/reparse disposable-host matrix remains **UNVERIFIED**.
- Blender optimizer: working-copy-only plan/apply harness **REAL RUNTIME VERIFIED** on harmless EEVEE plan; no speedup claimed. ArchViz profiles are **CODE/UNIT VERIFIED** only.
- Dependency audit: clean-install backend reports 5 High / 0 Critical production vulnerabilities; safe override experiment was rejected and removed. Nest 11 requires a separate canary.
- Decision: **PRODUCTION NO-GO**. Evidence: `reports/CWS_PRODUCTION_NO_GO_REMEDIATION_2026-08-05.md`.
- Founder product scope 2026-08-06: `/#admin` has separate Fleet + Customer CRM areas; `/` owns customer render → preview → payment → download. Evidence: `reports/product/CWS_FOUNDER_PRODUCT_FLOW_RECONCILIATION_2026-08-06.md` and `reports/product/CWS_CUSTOMER_CRM_MVP_2026-08-06.md`.

- 2026-08-06 production audit: Vercel root/Admin return HTTP 200; served bundle points to Render backend, contains fleet/CRM and `Bắt đầu render` markers, and no old pre-render payment CTA. Render `/health` is 200, CORS is exact-origin 204, `/staff/mfa-status` is 401 without credentials. Full physical Worker → Preview → Payment → Download runtime remains unverified.
- 2026-08-06 CRM deployment audit: Vercel deployment `dpl_6q4819cGaS3Hfv1y4xqtcQ62iREQ` is READY for `5e20211`; Render auto-deployed the backend and `/customers/crm` now returns HTTP 401 without credentials while `/health` is 200. Route protection is runtime verified; authenticated CRM data remains unverified pending Admin AAL2.
- 2026-08-06 fresh loop audit: production `/health` 200; anonymous `/jobs`, `/fleet/workers`, `/customers/crm`, and `/payments/reconciliation-anomalies` all return 401. Vercel bundle points to Render, contains CRM/Fleet markers, and has no pre-render payment CTA. Fleet counters and CRM aggregation are now separately unit-tested; backend 141/141 and frontend 9/9 pass.
- 2026-08-06 Scheduler state-order audit: queued/active/all-done/AWAITING_PAYMENT boundaries are covered by 4 new regression tests; backend 24 suites / 141 tests PASS. Evidence: `reports/product/CWS_SCHEDULER_STATE_ORDER_2026-08-06.md`.

- 2026-08-06: Node Agent retry backoff jitter is **CODE/UNIT VERIFIED** (32/32 worker offline tests); default remains unchanged. Evidence: `reports/worker/CWS_NODE_AGENT_JITTER_HARDENING_2026-08-06.md`.
- 2026-08-06: Node Agent non-blocking heartbeat is **CODE/UNIT VERIFIED**; single-flight daemon dispatch prevents remote heartbeat latency from blocking `tick()`. Worker offline suite is **35/35 PASS**.
- 2026-08-06: Job Object ownership is **CODE/UNIT VERIFIED** in `BlenderCliRenderer` behind an explicit staging opt-in; live Windows renderer integration and complete sandbox boundary remain **UNVERIFIED**. Evidence: `reports/worker/CWS_NODE_AGENT_NONBLOCKING_IO_JOB_OBJECT_2026-08-06.md`.
- 2026-08-06: Admin `GET /jobs` scope bug fixed: AAL2 staff receives all jobs, customers remain tenant-scoped, anonymous access is denied. Evidence: `reports/security/CWS_ADMIN_JOB_LIST_SCOPE_FIX_2026-08-06.md`.
- 2026-08-06: Admin UI keeps Fleet and Customer CRM as separate MVP areas; pre-render customer UI no longer shows price or payment CTA. Backend payment boundary remains `REVIEW_READY → approve → AWAITING_PAYMENT → PAID`. Evidence: `reports/product/CWS_FOUNDER_PRODUCT_FLOW_RECONCILIATION_2026-08-06.md`.

## Total review — 2026-08-05

- Security: current-tree credential fallback removed, Admin token URL exposure fixed, and staging admin RPC client EXECUTE revoked. Historical credentials require rotation. See `reports/security/CWS_FULL_SECURITY_AUDIT_2026-08-05.md`.
- Node Agent: prior Full E2E and multi-node evidence remains **REAL RUNTIME VERIFIED**; non-blocking heartbeat and Job Object ownership are **CODE/UNIT VERIFIED**, while SCM deployment, host isolation, quotas and rollback are **UNVERIFIED/BLOCKED**.
- Blender/ArchViz analyzer: **CODE VERIFIED** and harmless staging execution **REAL RUNTIME VERIFIED**; customer optimization remains **UNVERIFIED**.
- Production readiness: **NO-GO** pending production RPC migration, dependency canary, explicit CORS, host isolation, Admin AAL2 runtime, observability and rollback evidence.

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


## Generic Engine lease/fencing — 2026-08-05

- Added AttemptGuard boundary to generic Worker Engine for active lease assertion and heartbeat at claim/download/render/checkpoint boundaries.
- Stale generation rejection and cleanup are tested; no production heartbeat/RPC was sent.
- Combined Worker/Node/launcher offline suite: 17/17 PASS.
- Real Supabase lease/heartbeat integration remains UNVERIFIED pending isolated staging.


## Generic Engine failure classification — 2026-08-05

- Added conservative Blender failure classification: invalid/missing project markers are permanent; timeout/resource/driver/unknown failures remain retryable for Backend policy.
- Generic Engine tests 7/7; combined Worker/Node/launcher suite 18/18 PASS.
- No production job, Supabase RPC, B2 write or power action was performed.


## Worker P0 update — 2026-08-05

- Generic Worker Engine output integrity implemented: PNG signature/IHDR/dimensions validation before checkpoint/upload.
- Windows staging compile and combined suite: **22/22 PASS**.
- Evidence: `reports/worker/CWS_WORKER_OUTPUT_INTEGRITY_2026-08-05.md`.
- Classification: CODE/UNIT VERIFIED and Windows runtime validator verified; production/B2 E2E remains UNVERIFIED/BLOCKED.


## Worker P0 update — timeout cleanup (2026-08-05)

- Blender render subprocess supervision now has bounded timeout and Windows process-tree cleanup scoped to the owned PID.
- Windows staging compile + combined suite: **22/22 PASS**.
- Evidence: `reports/worker/CWS_WORKER_TIMEOUT_CLEANUP_2026-08-05.md`.
- Live timeout runtime test: UNVERIFIED; production/B2 E2E remains BLOCKED.


## Worker P0 update — capability preflight (2026-08-05)

- Dynamic JobSpec VRAM/RAM minimums and Worker-side final capability guard implemented.
- Windows staging compile + combined suite: **24/24 PASS**.
- Evidence: `reports/worker/CWS_WORKER_CAPABILITY_PREFLIGHT_2026-08-05.md`.
- Actual hardware capability discovery and production/B2 E2E remain UNVERIFIED/BLOCKED.


## Worker/Node Agent runtime integration update — 2026-08-05

- Windows staging real runtime: Node Agent → child Generic Worker → Blender 5.2 → output integrity → filesystem checkpoint → cleanup → ACTIVE_IDLE: **REAL RUNTIME VERIFIED**.
- Crash-once recovery: **REAL RUNTIME VERIFIED**.
- One-second timeout/process cleanup: **REAL RUNTIME VERIFIED** after fixing a staging harness hang.
- Hardware: RTX 2060 SUPER 8192 MiB, driver 576.88; RAM ≈16 GiB.
- Supabase lease/heartbeat and B2 staging upload/resume: **BLOCKED**; no isolated staging-safe credential/endpoint.
- Evidence: `reports/worker/CWS_WORKER_WINDOWS_RUNTIME_INTEGRATION_2026-08-05.md`.


## Staging E2E integration update — 2026-08-05

- Added credential-gated Supabase RPC and B2 S3-compatible staging adapters.
- Adapter tests + Worker suite: **26/26 PASS** on Windows Python runtime.
- No staging variables are currently present on this machine.
- Supabase/B2 FULL E2E: **BLOCKED** pending separate staging project, assignment JobSpec contract, bucket/prefix and least-privilege credentials.
- Evidence/Owner action: `reports/worker/CWS_STAGING_E2E_CONTRACT_2026-08-05.md`.

## New Windows machine context recovery — 2026-08-05

- Official `cws-portal` recovered from GitHub `main` at `72a175ba`; no duplicate checkout found.
- User-scoped Git and Python 3.12.10 were prepared; Node 24.19.0/npm 11.17.0 were already present.
- Generic Worker/Node Agent offline suite: **28/28 PASS** after fixing two existing verification defects (PNG signature literal and test syntax/timing).
- Blender, Supabase CLI, B2 credentials and staging variables remain absent; this is machine readiness, not staging E2E.
- Evidence: `reports/worker/CWS_NEW_MACHINE_CONTEXT_RECOVERY_2026-08-05.md`.
- Next: real isolated staging E2E when staging artifacts and credentials are present.

## Staging blocker audit — 2026-08-05

- Machine-safe env inspection: no `CWS_STAGING_*`, Supabase, B2, AWS or S3 values present.
- Supabase connector: exactly one non-staging project visible; it was not queried or mutated.
- Existing claim RPC returns insufficient fields for a complete dynamic JobSpec; no inference was made.
- Added staging-only migration/RPC `worker_migrations/016_staging_job_assignment_contract.sql`; code/test verified, not yet applied or runtime-verified in Supabase staging.
- B2 staging bucket/prefix/application key is absent.
- Evidence: `reports/worker/CWS_STAGING_BLOCKER_AUDIT_2026-08-05.md` and `reports/worker/CWS_STAGING_ASSIGNMENT_RPC_IMPLEMENTATION_2026-08-05.md`.
- Next: Owner supplies isolated staging project + assignment contract and B2 scoped key; then run FULL E2E immediately.

## FULL staging E2E — REAL RUNTIME VERIFIED — 2026-08-05

- Supabase staging assignment → Node Agent → Generic Worker Engine → Blender 5.2 → output integrity → B2 staging checkpoint/HEAD+SHA-256 → Supabase completion → cleanup → ACTIVE_IDLE: **REAL RUNTIME VERIFIED**.
- Job `staging-safe-20260805-01`, task `1`, worker `cws-staging-worker-01`, generation `3`; no production endpoint or `cws_worker_full.py` runtime used.
- Evidence: `reports/worker/CWS_STAGING_FULL_E2E_REAL_RUNTIME_VERIFIED_2026-08-05.md`.

## P0 follow-up — Admin / multi-node / isolation — 2026-08-05

- Admin Fleet real runtime: **BLOCKED/UNVERIFIED**. Code maps fresh heartbeat/lifecycle states and enforces AAL2, but staging has no `staff_roles`/`staff_worker_access` rows; no bypass or fake heartbeat was added.
- Multi-node assignment/failover: **REAL RUNTIME VERIFIED** on staging. Evidence: `reports/worker/CWS_MULTI_NODE_FAILOVER_REAL_RUNTIME_VERIFIED_2026-08-05.md`.
- Hostile `.blend` isolation: **UNVERIFIED/BLOCKED** pending a disposable Windows Sandbox-capable staging host. Evidence: `reports/worker/CWS_HOSTILE_BLEND_ISOLATION_POC_2026-08-05.md`.
- Production rollout: **NO-GO** until Admin AAL2 runtime, deployment, isolation, credential, monitoring and rollback gates pass. Checklist: `reports/worker/CWS_PRODUCTION_ROLLOUT_READINESS_2026-08-05.md`.

## Admin/Auth and isolation follow-up — 2026-08-05

- Staging Admin RBAC migration `017_staging_admin_rbac_contract.sql`: **REAL STAGING SCHEMA VERIFIED**; exact application contract, RLS enabled, no client policies.
- Admin Fleet through real UI: **BLOCKED/UNVERIFIED** pending Owner-created staging Auth identity, MFA enrollment/AAL2 session, and server-only staging backend configuration. Evidence: `reports/worker/CWS_ADMIN_FLEET_STAGING_AUTH_BLOCKER_2026-08-05.md`.
- Isolation alternative: **PARTIAL REAL RUNTIME VERIFIED** for Job Object timeout/child cleanup; filesystem boundary and network restriction remain **UNVERIFIED/BLOCKED**. Evidence: `reports/worker/CWS_HOSTILE_BLEND_ISOLATION_POC_2026-08-05.md`.
