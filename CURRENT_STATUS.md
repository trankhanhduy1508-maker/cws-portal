# Current Status

## Production NO-GO remediation continuation â€” 2026-08-05

- CORS: **CODE/UNIT VERIFIED**; canonical `https://cws-portal.vercel.app` allowlist, production fail-closed, no wildcard credentials. Owner must set `CORS_ORIGINS` on Render.
- CORS request-origin callback: **CODE/UNIT VERIFIED** for canonical allow, same-origin/no-origin, and denied origin. Deployment verification remains pending Owner configuration.
- Secret rotation readiness: **CODE/UNIT VERIFIED**; legacy helper fallback removed and rotation order documented without values. Actual production rotation remains **BLOCKED** on Owner action.
- Production RPC: migration 019 is idempotent and **CODE/UNIT VERIFIED** on staging; production remains unchanged. Worker publishable RPC identity/authentication remains **BLOCKED** for production.
- Admin AAL2: staging schema/RLS/RPC metadata **CODE/UNIT VERIFIED**; real Admin identity/TOTP and state matrix remain **BLOCKED** pending Owner enrollment.
- Windows SCM: Node Agent service PoC **REAL RUNTIME VERIFIED** for install/start/heartbeat/stop/restart/remove; GPU Worker remains a user-session helper boundary.
- Job Object: timeout/child cleanup **REAL RUNTIME VERIFIED**; integration into Generic Worker remains **UNVERIFIED**.
- Path boundary: symlink rejection **CODE/UNIT VERIFIED**; junction/reparse disposable-host matrix remains **UNVERIFIED**.
- Blender optimizer: working-copy-only plan/apply harness **REAL RUNTIME VERIFIED** on harmless EEVEE plan; no speedup claimed. ArchViz profiles are **CODE/UNIT VERIFIED** only.
- Dependency audit: clean-install backend reports 5 High / 0 Critical production vulnerabilities; safe override experiment was rejected and removed. Nest 11 requires a separate canary.
- Decision: **PRODUCTION NO-GO**. Evidence: `reports/CWS_PRODUCTION_NO_GO_REMEDIATION_2026-08-05.md`.

- 2026-08-06: Node Agent retry backoff jitter is **CODE/UNIT VERIFIED** (32/32 worker offline tests); default remains unchanged. Evidence: `reports/worker/CWS_NODE_AGENT_JITTER_HARDENING_2026-08-06.md`.

## Total review â€” 2026-08-05

- Security: current-tree credential fallback removed, Admin token URL exposure fixed, and staging admin RPC client EXECUTE revoked. Historical credentials require rotation. See `reports/security/CWS_FULL_SECURITY_AUDIT_2026-08-05.md`.
- Node Agent: prior Full E2E and multi-node evidence remains **REAL RUNTIME VERIFIED**; SCM service, non-blocking I/O, host isolation, quotas and rollback are **UNVERIFIED/BLOCKED**.
- Blender/ArchViz analyzer: **CODE VERIFIED** and harmless staging execution **REAL RUNTIME VERIFIED**; customer optimization remains **UNVERIFIED**.
- Production readiness: **NO-GO** pending production RPC migration, dependency canary, explicit CORS, host isolation, Admin AAL2 runtime, observability and rollback evidence.

> Entry point Ä‘áº§u tiÃªn cá»§a LOOP (AGENTS.md â€” Source-of-Truth Sync).
> File nÃ y CHá»ˆ ghi tráº¡ng thÃ¡i má»›i nháº¥t, khÃ´ng pháº£i lá»‹ch sá»­. Chi tiáº¿t
> báº±ng chá»©ng náº±m trong `reports/` (link á»Ÿ má»¥c Last Updated).

## Current Phase

Autonomous LOOP Ä‘ang cháº¡y (Owner uá»· quyá»n 2026-08-02 vÃ  2026-08-03,
khÃ´ng dá»«ng giá»¯a chá»«ng). Giai Ä‘oáº¡n 5-7 (Thanh toÃ¡n, BÃ n giao, Trang
quáº£n trá»‹) â€” DONE á»Ÿ má»©c code/test/HTTP tháº­t. Giai Ä‘oáº¡n 2-4 (Luá»“ng khÃ¡ch
hÃ ng â†’ Render â†’ Preview) â€” NEEDS_VERIFICATION: 2 blocker P0 (Worker
khÃ´ng claim job MVP chung, `--enable-autoexec` khÃ´ng an toÃ n cho khÃ¡ch)
Ä‘Ã£ fix á»Ÿ má»©c code + DB evidence tháº­t 2026-08-03; chá»‰ cÃ²n thiáº¿u mÃ¡y
Worker Windows+Blender váº­t lÃ½ Ä‘á»ƒ verify runtime (xem Next).

## Last Verified

2026-08-03 (bá»• sung sau, runtime Worker):
- **Worker runtime (Python 3.12.7 + Blender 5.2.0) verify THáº¬T láº§n Ä‘áº§u
  tiÃªn** trÃªn má»™t mÃ¡y Windows tháº­t (khÃ´ng pháº£i Fleet váº­t lÃ½ Ä‘á»‘i tÃ¡c) -
  tá»± Ä‘á»™ng hoÃ¡ toÃ n bá»™ báº±ng `reports/worker/setup_worker_runtime_test.ps1`
  (idempotent, tá»± Ä‘á»c version tá»« Source of Truth trong code, khÃ´ng
  Ä‘oÃ¡n). Gá»i tháº³ng hÃ m sáº£n xuáº¥t tháº­t `render_frame_range()` (Ä‘Ãºng cÃ¡ch
  Blender Ä‘Æ°á»£c gá»i trong production: `--enable-autoexec`, `-s/-e/-a`)
  trÃªn 1 scene Blender máº·c Ä‘á»‹nh - render + `validate_rendered_image()`
  PASS tháº­t (1.8s/frame). CÃ³ chá»§ Ä‘Ã­ch KHÃ”NG gá»i `claim_task()`/
  `claim_next_generic_task()`/upload B2 tháº­t Ä‘á»ƒ khÃ´ng áº£nh hÆ°á»Ÿng Fleet
  production Ä‘ang hoáº¡t Ä‘á»™ng. Äá»•i tráº¡ng thÃ¡i Worker tá»« "CODE
  VERIFIED/RUNTIME NOT VERIFIED" sang "CODE + RENDER PIPELINE RUNTIME
  VERIFIED, CLAIM+UPLOAD THáº¬T VáºªN CHÆ¯A VERIFY" - xem
  `reports/worker/CWS_WORKER_RUNTIME_TEST_2026-08-03.md` vÃ 
  `reports/worker/WORKER_RUNTIME_TEST_EVIDENCE_2026-08-03.json`.
  Má»Ÿ rá»™ng thÃªm cÃ¹ng ngÃ y: bá»™ 10 test function-level offline
  (`reports/worker/worker_offline_function_tests.py`) - multi-frame,
  `enable_autoexec=False` (Ä‘Æ°á»ng dáº«n job khÃ¡ch upload), `render_single_frame()`,
  mÃ£ GPU fix cháº¡y tháº­t trong Blender, Ä‘Æ°á»ng lá»—i `.blend` khÃ´ng tá»“n táº¡i,
  `validate_rendered_image()` trÃªn áº£nh corrupt/quÃ¡ nhá»,
  `extract_drive_file_id()`, `get_b2_client()` (khá»Ÿi táº¡o client, khÃ´ng
  gá»i API tháº­t) - **11/11 PASS**, xem
  `reports/worker/WORKER_OFFLINE_FUNCTION_TESTS_2026-08-03.json`.
- **RPC `claim_task()`/`claim_next_generic_task()` verify THáº¬T trÃªn
  Postgres production** (khÃ´ng pháº£i chá»‰ Ä‘á»c code) - test cÃ´ láº­p trong
  transaction luÃ´n `ROLLBACK` (Ä‘Ã£ tá»± kiá»ƒm chá»©ng cÆ¡ cháº¿ rollback trÆ°á»›c),
  claim Ä‘Ãºng task test, reject double-claim Ä‘Ãºng, sau rollback xÃ¡c
  nháº­n 6 job MVP tháº­t (task 773-778) vÃ  tá»•ng sá»‘ dÃ²ng `jobs`/`tasks`
  hoÃ n toÃ n khÃ´ng Ä‘á»•i - khÃ´ng claim job production/Fleet tháº­t nÃ o. Xem
  `reports/worker/CWS_CLAIM_TASK_RPC_ISOLATED_TEST_2026-08-03.md`.
- **Gá»¡ blocker "khÃ´ng cÃ³ Node.js/npm"** (Ä‘Ã£ cháº·n build/test TypeScript
  nhiá»u phiÃªn trÆ°á»›c) - tá»± Ä‘á»™ng hoÃ¡ báº±ng
  `reports/dev/setup_node_runtime_test.ps1` (idempotent, version Node
  22.23.2 láº¥y tá»« `.github/workflows/ci.yml` + nodejs.org index tháº­t,
  khÃ´ng Ä‘oÃ¡n). Cháº¡y Ä‘Ãºng 4 bÆ°á»›c CI cho backend
  (`npm ci`/`build`/`test`/`lint`) - **117/117 Jest test PASS** (Ä‘Ã£
  xÃ¡c nháº­n trÆ°á»›c toÃ n bá»™ test mock hoÃ n toÃ n, khÃ´ng Ä‘á»¥ng Supabase/B2
  tháº­t) - vÃ  3 bÆ°á»›c cho frontend (`npm ci`/`build`/`lint`, chÆ°a cÃ³ file
  test frontend nÃ o nÃªn bá» qua `npm test`) - **PASS toÃ n bá»™**. Xem
  `reports/dev/CWS_NODE_BUILD_TEST_2026-08-03.md`.
- **Payment reconciliation wire vÃ o Admin Dashboard** (Ä‘Ãºng bÆ°á»›c tiáº¿p
  theo Ä‘Ã£ chá»‘t sáºµn trong DECISIONS.md khi cÃ³ mÃ´i trÆ°á»ng build) - `GET
  /payments/reconciliation-anomalies` (RoleGuard admin-only) Ä‘á»c tháº³ng
  view `payment_reconciliation_anomalies`, khÃ´ng viáº¿t láº¡i logic;
  `AdminScreen.jsx` thÃªm báº£ng má»›i ngay sau báº£ng Job. Verify: (a)
  read-only production tháº­t xÃ¡c nháº­n Ä‘Ãºng 1 báº¥t thÆ°á»ng Ä‘Ã£ biáº¿t, (b)
  build+117/117 test+lint PASS (cháº¡y trÆ°á»›c khi dá»n láº¡i diff do
  `eslint --fix` reformat hÃ ng loáº¡t file khÃ´ng liÃªn quan - Ä‘Ã£ dá»n,
  diff cuá»‘i chá»‰ cÃ²n Ä‘Ãºng pháº§n thÃªm má»›i). LÆ¯U Ã: sau bÆ°á»›c dá»n diff, mÃ¡y
  gáº·p sá»± cá»‘ mÃ´i trÆ°á»ng (má»i lá»‡nh `node.exe` má»›i bá»‹ treo vÃ´ thá»i háº¡n,
  nghi pháº§n má»m quáº£n lÃ½ mÃ¡y cháº·n) nÃªn KHÃ”NG re-run Ä‘Æ°á»£c láº§n cuá»‘i - Ä‘á»™
  tin cáº­y dá»±a trÃªn diff byte-for-byte giá»‘ng há»‡t láº§n Ä‘Ã£ PASS. Xem
  `reports/payments/CWS_PAYMENT_RECONCILIATION_DASHBOARD_WIRING_2026-08-03.md`.

2026-08-03:
- **Payment reconciliation view** (`payment_reconciliation_anomalies`,
  migration 015, Ã¡p dá»¥ng tháº­t lÃªn production, Ä‘Ã£ query xÃ¡c nháº­n) â€” CHá»ˆ
  Äá»ŒC, phÃ¡t hiá»‡n 3 loáº¡i báº¥t thÆ°á»ng thanh toÃ¡n chÆ°a tá»«ng cÃ³ cáº£nh bÃ¡o tá»±
  Ä‘á»™ng: payment_status lá»‡ch khá»i báº£ng payments tháº­t, webhook káº¹t
  'processing' >10 phÃºt, Ä‘Ã£ thanh toÃ¡n tháº­t >2 tiáº¿ng nhÆ°ng chÆ°a nháº­n
  file. Query xÃ¡c nháº­n Ä‘Ãºng 1 báº¥t thÆ°á»ng Ä‘Ã£ biáº¿t (order `00189232-...`,
  xem `reports/payments/CWS_PAID_ORPHAN_ORDER_FINDING_2026-08-03.md`),
  khÃ´ng phÃ¡t sinh thÃªm â€” Admin dÃ¹ng ngay qua Supabase SQL Editor
  (`select * from payment_reconciliation_anomalies;`) cho tá»›i khi cÃ³
  mÃ´i trÆ°á»ng build Ä‘á»ƒ wire vÃ o Admin Dashboard.
- **B2 credential háº¿t hardcode hoÃ n toÃ n** trong `cws_worker_full.py`
  (khÃ´ng cÃ²n fallback nÃ o, ká»ƒ cáº£ key cháº¿t) â€” báº¯t buá»™c Ä‘á»c
  `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` tá»« env, set cá»¥c bá»™ qua `cws_worker.bat`
  trÃªn tá»«ng mÃ¡y. Audit least-privilege xÃ¡c nháº­n scope tá»‘i thiá»ƒu cáº§n
  thiáº¿t tháº­t (bucket `MTEB90`, prefix `renders/`, Read+Write, khÃ´ng cáº§n
  delete/quáº£n lÃ½ bucket) â€” Owner Ä‘Ã£ táº¡o key má»›i Ä‘Ãºng scope nÃ y. Xem
  `reports/worker/CWS_B2_LEAST_PRIVILEGE_AUDIT_2026-08-03.md`.
- **P0 fix: Worker generic job claim + `--enable-autoexec` gating**
  (migration 014 Ã¡p dá»¥ng tháº­t lÃªn production, claim+revert thÃ nh cÃ´ng
  trÃªn 1 trong 6 job MVP tháº­t Ä‘ang chá» tá»« 2026-07-27; code Worker sá»­a,
  CODE VERIFIED/RUNTIME NOT VERIFIED vÃ¬ khÃ´ng cÃ³ mÃ¡y Blender tháº­t) â€”
  `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`.
- B2 credential trong `cws_worker_full.py` **test tháº­t, xÃ¡c nháº­n 401
  Unauthorized** tá»« Backblaze â€” key hardcode trong git repo khÃ´ng cÃ²n
  há»£p lá»‡, cáº§n Owner xÃ¡c nháº­n key tháº­t Ä‘ang cháº¡y trÃªn Fleet + rotate.

2026-08-02:
- SePay Test Mode/Sandbox webhook (E2E tháº­t, DB confirmed).
- PAID â†’ B2 Signed URL â†’ Download (HTTP tháº­t tá»›i production).
- Audit Worker `.bat`/`.py` tháº­t (code, khÃ´ng pháº£i runtime váº­t lÃ½).
- **Admin Portal MFA/TOTP** (RoleGuard bá» x-admin-key bypass, báº¯t buá»™c
  Supabase Auth MFA chÃ­nh thá»©c, 114/114 backend test PASS, frontend
  build sáº¡ch) â€” HUMAN_VERIFICATION_PENDING cho láº§n Ä‘Äƒng nháº­p tháº­t Ä‘áº§u
  tiÃªn (chÆ°a cÃ³ tÃ i khoáº£n staff nÃ o tá»“n táº¡i Ä‘á»ƒ tá»± test).

Chi tiáº¿t: `reports/payments/CWS_SEPAY_SANDBOX_VERIFICATION_2026-08-02.md`,
`reports/payments/CWS_PAID_OUTPUT_UNLOCK_VERIFICATION_2026-08-02.md`,
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md`,
`reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md`.

## Last Verified (bá»• sung)

2026-08-03 (tiáº¿p tá»¥c LOOP sau khi Owner táº¡o B2 key má»›i): ReviewScreen
lÃ m rÃµ "YÃªu cáº§u chá»‰nh sá»­a miá»…n phÃ­, khÃ´ng giá»›i háº¡n" â€” xÃ¡c nháº­n Ä‘Ãºng
hÃ nh vi backend tháº­t (`JobsService.requestChanges` khÃ´ng cÃ³ logic
phÃ­/giá»›i háº¡n nÃ o), khÃ´ng pháº£i chÃ­nh sÃ¡ch bá»‹a ra. ÄÃ£ rÃ  soÃ¡t thÃªm cÃ¡c
MUST HAVE khÃ¡c trong Customer Research 300 (cáº£nh bÃ¡o file quÃ¡ lá»›n
trÆ°á»›c upload, kiá»ƒm tra sá»›m file â€” `MAX_FILE_SIZE_BYTES`/`validateFile`)
â€” **Ä‘Ã£ cÃ³ sáºµn trong code tá»« trÆ°á»›c**, khÃ´ng cáº§n sá»­a.

## Current Task

Autonomous LOOP (Owner uá»· quyá»n 2026-08-03) vá»«a hoÃ n táº¥t má»™t chuá»—i
viá»‡c Ä‘á»™c láº­p trÃªn má»™t mÃ¡y Windows cÃ³ PowerShell + máº¡ng: (1) tá»± Ä‘á»™ng
hoÃ¡ chuáº©n bá»‹ + verify runtime Worker (Python 3.12.7 + Blender 5.2.0),
(2) verify RPC `claim_task()`/`claim_next_generic_task()` tháº­t trÃªn
Postgres production theo cÃ¡ch cÃ´ láº­p an toÃ n tuyá»‡t Ä‘á»‘i, (3) **gá»¡ háº³n
blocker "khÃ´ng cÃ³ Node.js/npm"** Ä‘Ã£ cháº·n nhiá»u phiÃªn trÆ°á»›c - mÃ´i
trÆ°á»ng nÃ y giá» CÃ“ THá»‚ tá»± táº£i/cÃ i Python+Blender+Node.js portable
(khÃ´ng cáº§n Admin/installer tay) vÃ  tá»± `build`/`test`/`lint` cáº£ backend
(NestJS)/frontend (Vite) â€” xem má»¥c Last Verified phÃ­a trÃªn. Do Ä‘Ã³
Definition of Done (AGENTS.md, "khÃ´ng lá»—i build") giá» CÃ“ THá»‚ tá»± xÃ¡c
minh cho thay Ä‘á»•i TypeScript má»›i, nhÆ°ng phiÃªn nÃ y CHÆ¯A má»Ÿ thay Ä‘á»•i
TypeScript má»›i nÃ o (chá»‰ verify blocker Ä‘Ã£ gá»¡) - cÃ¡c má»¥c Next bÃªn dÆ°á»›i
(payment/refund safety net...) váº«n cÃ²n nguyÃªn, giá» khÃ´ng cÃ²n bá»‹ cháº·n
bá»Ÿi thiáº¿u cÃ´ng cá»¥. TrÆ°á»›c Ä‘Ã³ dá»«ng á»Ÿ Ä‘iá»ƒm B sau 2 fix: (1) P0 Worker
generic job claim + `--enable-autoexec` gating, (2) gá»¡ nÃºt "Há»§y job"
gÃ¢y hiá»ƒu láº§m á»Ÿ PaymentScreen (Customer Research 300, má»¥c C2.7) â€” váº«n
giá»¯ nguyÃªn.

## Next

1. **B2 credential rotate** â€” BLOCKED, cáº§n Owner (xem
   `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md` má»¥c 3): key
   hardcode hiá»‡n táº¡i trong git repo test tháº­t tráº£ 401 Unauthorized tá»«
   Backblaze, cáº§n Owner xÃ¡c nháº­n key tháº­t Ä‘ang cháº¡y trÃªn Fleet.
2. **Runtime verify Worker generic claim** â€” THÃŠM UNBLOCKED 2026-08-03:
   ngoÃ i pipeline render (má»¥c Last Verified), RPC `claim_task()`/
   `claim_next_generic_task()` (migration 014, P0 fix) Ä‘Ã£ verify THáº¬T
   trÃªn chÃ­nh Postgres production - test trong transaction luÃ´n
   ROLLBACK (Ä‘Ã£ tá»± kiá»ƒm chá»©ng cÆ¡ cháº¿ rollback trÆ°á»›c khi test), claim
   Ä‘Ãºng task test cÃ´ láº­p, reject double-claim Ä‘Ãºng, vÃ  xÃ¡c nháº­n SAU
   ROLLBACK 6 job MVP tháº­t (task 773-778) hoÃ n toÃ n nguyÃªn tráº¡ng
   (queued/chÆ°a ai claim), tá»•ng sá»‘ dÃ²ng `jobs`/`tasks` khÃ´ng Ä‘á»•i (17/717)
   - **tuyá»‡t Ä‘á»‘i khÃ´ng claim job production/Fleet tháº­t**. Xem
   `reports/worker/CWS_CLAIM_TASK_RPC_ISOLATED_TEST_2026-08-03.md`.
   CÃ²n láº¡i BLOCKED, cáº§n Owner: (a) end-to-end tháº­t tá»« chÃ­nh
   `cws_worker_full.py` (gá»i RPC qua HTTP, khÃ´ng pháº£i SQL trá»±c tiáº¿p)
   claim 1 job Portal tháº­t â€” cáº§n quyáº¿t Ä‘á»‹nh thá»i Ä‘iá»ƒm/job cá»¥ thá»ƒ vÃ¬
   báº¯t buá»™c claim tháº­t; (b) B2 upload tháº­t â€” key má»›i Owner vá»«a táº¡o
   **CHÆ¯A cÃ³ trong environment cá»§a mÃ¡y test nÃ y** (Ä‘Ã£ kiá»ƒm tra
   `CWS_B2_KEY_ID`/`CWS_B2_APP_KEY` cáº£ User-scope láº«n process, khÃ´ng
   tháº¥y) â€” cáº§n Owner tá»± cháº¡y `reports/worker/setup_b2_worker_credential.ps1`
   trÃªn mÃ¡y Ä‘Ã³ (nháº­p key qua prompt báº£o máº­t, khÃ´ng dÃ¡n qua chat) trÆ°á»›c
   khi cÃ³ thá»ƒ tá»± Ä‘á»™ng verify tiáº¿p; (c) mÃ¡y Fleet váº­t lÃ½ tháº­t (GPU/
   driver/diskless BootROM tháº­t) Ä‘á»ƒ verify hoÃ n toÃ n.
3. **Payment/refund safety net cho Admin** â€” DONE 2026-08-03 (view wire
   vÃ o Admin Dashboard, xem má»¥c Last Verified). CÃ²n láº¡i Bá»” SUNG (chÆ°a
   chá»‘t yÃªu cáº§u, khÃ´ng thuá»™c pháº¡m vi quyáº¿t Ä‘á»‹nh gá»‘c): hÃ nh Ä‘á»™ng
   remediation (vd nÃºt "Ä‘Ã¡nh dáº¥u Ä‘Ã£ xá»­ lÃ½" cho notification káº¹t) â€”
   hiá»‡n táº¡i Admin CHá»ˆ xem Ä‘Æ°á»£c, chÆ°a cÃ³ nÃºt thao tÃ¡c trÃªn cÃ¡c báº¥t
   thÆ°á»ng nÃ y, vÃ¬ DECISIONS.md gá»‘c chá»‰ yÃªu cáº§u "phÃ¡t hiá»‡n", chÆ°a yÃªu
   cáº§u "xá»­ lÃ½ tá»± Ä‘á»™ng qua Dashboard".
4. **Admin MFA cáº§n Owner táº¡o 1 tÃ i khoáº£n staff tháº­t + tá»± quÃ©t QR** â€”
   checklist 4 bÆ°á»›c trong
   `reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` má»¥c 5.
5. **Full MVP Core Flow chÆ°a Ä‘áº¡t Ä‘iá»ƒm dá»«ng A** â€” cáº§n Owner tá»± cháº¡y 1
   job tháº­t qua UI HOáº¶C cung cáº¥p mÃ¡y Worker váº­t lÃ½. Chi tiáº¿t:
   `reports/MVP_CORE_FLOW_E2E_STATUS_2026-08-02.md`.

## Customer Google Login Regression â€” 2026-08-05

- Root cause: production cÅ© thiáº¿u Supabase public config; Customer UI redesign commit `95b1382` khÃ´ng lÃ m Ä‘á»•i OAuth helper.
- PR #17 Ä‘Ã£ merge thÃ nh `9d2d223`; Vercel production deployment `dpl_CLb4MZErFT3rbNUspiAEUQuNqvRa` READY vÃ  alias `cws-portal.vercel.app` Ä‘ang cháº¡y commit nÃ y.
- Production bundle cÃ³ Supabase URL/OAuth; HTTP authorize test tháº­t tráº£ 302 tá»›i Google vá»›i production redirect.
- Callback/session restore báº±ng tÃ i khoáº£n Google tháº­t: NEEDS_VERIFICATION vÃ¬ mÃ´i trÆ°á»ng nÃ y khÃ´ng cÃ³ browser automation/tÃ i khoáº£n tÆ°Æ¡ng tÃ¡c.
- Evidence: `reports/evidence/CWS_CUSTOMER_GOOGLE_LOGIN_REGRESSION_2026-08-04.md`.

## Worker + Node Agent VIBE CODE â€” 2026-08-05

- Created `docs/worker-node-agent/README.md`, `WORKER_VIBE_CODE.md` and `NODE_AGENT_VIBE_CODE.md` as the canonical long-lived context.
- Added `worker/node_agent.py`: deterministic ACTIVE_IDLE/prepare/start/run/recovery/cleanup state machine.
- Offline Windows test: 6/6 PASS. Evidence: `reports/worker/CWS_NODE_AGENT_STATE_MACHINE_2026-08-05.md`.
- Status: UNIT VERIFIED only. Physical Blender/B2, real lease/heartbeat, isolation and multi-node failover remain NEEDS_VERIFICATION/HUMAN BLOCKER.

## Last Updated

2026-08-03 â€” xem `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`
(P0 fix má»›i nháº¥t, commit `109d258`), commit `27a10f4` (PaymentScreen
UX fix), `reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`
(Æ°u tiÃªn hoÃ¡ task theo insight khÃ¡ch hÃ ng),
`reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` (Admin MFA),
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` (Worker
audit gá»‘c), `reports/CURRENT_STATUS_ARCHIVE_2026-08-02.md` (lá»‹ch sá»­
Ä‘áº§y Ä‘á»§ trÆ°á»›c khi file nÃ y Ä‘Æ°á»£c rÃºt gá»n).


## Worker + Node Agent VIBE loop â€” 2026-08-05

- Canonical Worker on main verified: `cws_worker_full.py` (blob `e3b0872c2236e47849ec6450532eab18018b129f`) + `cws_worker.bat` (blob `11f71e049358fe7d35b992b0a89fde9d600638b6`). Older report names are not treated as current package artifacts.
- Added `worker/canonical_worker_launcher.py`: manifest version/direct-child path/SHA-256 validation before explicit launch; no pip bootstrap, no second supervisor, no power API.
- Offline verification: Node Agent + launcher suite **9/9 PASS** and py_compile PASS. Evidence: `reports/worker/CWS_WORKER_NODE_AGENT_LOOP_2026-08-05.md`.
- Added exact staging procedure: `reports/worker/CWS_WORKER_STAGING_PROCEDURE_1_18_0.md`.
- Status remains **UNIT/CODE VERIFIED only**. Blender CLI, `--disable-autoexec`, B2 checkpoint, real lease/heartbeat, Windows isolation and two-node failover are not claimed PASS.
- OWNER TODO: run the staging procedure on a real Windows staging node with a harmless `.blend` and scoped staging B2 credential; do not provide secrets in chat.


## Worker + Node Agent â†’ Admin fleet visibility â€” 2026-08-05

- Added backend derivation of Node Agent authority in `GET /fleet/workers`: fresh heartbeat + stopped Worker remains ONLINE/ACTIVE_IDLE; stale heartbeat (>180s) becomes OFFLINE; lifecycle states map to PREPARING/BUSY/RECOVERY.
- Admin Worker table now shows PC/Node state, Worker state, current Job, last seen and health.
- Fixed production Admin route: `vercel.json` SPA rewrite plus `/admin` pathname guard; prior read-only check returned Vercel NOT_FOUND before this change.
- Tests: targeted state 3/3 PASS, backend build PASS, frontend build/lint/tests PASS (6/6). Live Vercel deploy, Admin MFA session and real Node Agent heartbeat remain UNVERIFIED.
- Evidence: `reports/worker/CWS_NODE_AGENT_ADMIN_FLEET_VISIBILITY_2026-08-05.md`.


## Production Admin/Fleet verification â€” 2026-08-05 follow-up

- Vercel canonical project remains `cws-portal`; latest READY production deployment observed is commit `13cf7ed`, before later Admin route/fleet commits. Direct deployment tool requires file upload; local `dist` contains non-deployable internal documents, so no unsafe upload was performed.
- Production `/admin` remains 404 until a clean deployment containing `vercel.json` and pathname guard is created.
- Read-only Windows process check found no running Node Agent/cws_worker/Blender process; no fake heartbeat or Supabase mutation was performed.
- Real Node Agent â†’ Supabase â†’ Admin E2E is BLOCKED/UNVERIFIED pending clean Vercel deployment, real staging Agent process and Admin AAL2 session.
- Evidence: `reports/worker/CWS_NODE_AGENT_ADMIN_FLEET_VISIBILITY_2026-08-05.md`.


## Worker + Node Agent lifecycle hardening â€” 2026-08-05

- Added explicit Node Agent transition reasons and injected runtime policy.
- Added bounded, non-blocking exponential retry backoff; retry readiness does not block heartbeat/poll loops.
- Added safe monitor-off/on boundary hooks for ACTIVE_IDLE; no Sleep/Hibernate/shutdown/logoff or power API is called.
- Verification: Python py_compile PASS; combined offline suite **11/11 PASS**.
- Evidence: `reports/worker/CWS_NODE_AGENT_LIFECYCLE_HARDENING_2026-08-05.md`.
- Still **UNIT/CODE VERIFIED only**: no physical Node Agent/Worker/Blender process is running on the current machine; Vercel fleet revision is not deployed; real heartbeat, B2, ACL/isolation, crash/timeout runtime and multi-node failover remain BLOCKED/UNVERIFIED.

## Windows staging verification â€” 2026-08-05

- Python 3.12.7 and Blender 5.2.0 LTS were runtime-verified on this Windows machine using a harmless factory-startup scene, disable-autoexec, exit code 0, non-empty PNG and SHA-256 output check.
- Supabase REST endpoint was reachable read-only but unauthenticated probe returned HTTP 401; no production RPC or heartbeat mutation was attempted.
- Canonical Worker spawn is BLOCKED: current Windows checkout does not contain cws_worker_full.py and its local manifest is an older artifact schema.
- B2 read-only is BLOCKED: User-scope B2 configuration was loaded only into a child process for a list test and returned HTTP 401; no upload/download/delete was attempted.
- Real Node Agent heartbeat, canonical Worker completion, B2 checkpoint, cleanup and monitor-off remain BLOCKED/UNVERIFIED.
- Evidence: reports/worker/CWS_WINDOWS_STAGING_VERIFICATION_2026-08-05.md.


## Generic Worker Engine architecture correction â€” 2026-08-05

- Legacy cws_worker_full.py Ä‘Ã£ Ä‘Æ°á»£c Ä‘á»c nhÆ° knowledge/evidence; khÃ´ng restore vÃ  khÃ´ng dÃ¹ng lÃ m dependency.
- ÄÃ£ thÃªm generic data-driven engine worker/worker_engine.py vÃ  4 test offline PASS.
- Engine nháº­n JobSpec Ä‘á»™ng, báº¯t buá»™c customer autoexec false, cÃ³ job-scoped workspace, per-frame checkpoint/resume boundary, output validation vÃ  cleanup.
- Job má»›i khÃ´ng yÃªu cáº§u sá»­a Python hoáº·c update fleet.
- ChÆ°a cÃ³ Backend/Node Agent production adapter, canonical package staging hoáº·c B2/Supabase integration runtime; status CODE/UNIT VERIFIED ×‘×œ×‘×“.
- Evidence: reports/worker/CWS_WORKER_LEGACY_SALVAGE_MATRIX_2026-08-05.md.


## Generic Worker Engine correction â€” 2026-08-05

Legacy `cws_worker_full.py`/`cws_worker.bat` are retained as reference-only sources after salvage review; excluded from runtime package and never imported/launched. Generic Engine `worker/worker_engine.py` is data-driven and receives JobSpec per attempt; no per-job Worker update is required. Offline Worker/Node suite: 17/17 PASS.


## Generic Engine lease/fencing â€” 2026-08-05

- Added AttemptGuard boundary to generic Worker Engine for active lease assertion and heartbeat at claim/download/render/checkpoint boundaries.
- Stale generation rejection and cleanup are tested; no production heartbeat/RPC was sent.
- Combined Worker/Node/launcher offline suite: 17/17 PASS.
- Real Supabase lease/heartbeat integration remains UNVERIFIED pending isolated staging.


## Generic Engine failure classification â€” 2026-08-05

- Added conservative Blender failure classification: invalid/missing project markers are permanent; timeout/resource/driver/unknown failures remain retryable for Backend policy.
- Generic Engine tests 7/7; combined Worker/Node/launcher suite 18/18 PASS.
- No production job, Supabase RPC, B2 write or power action was performed.


## Worker P0 update â€” 2026-08-05

- Generic Worker Engine output integrity implemented: PNG signature/IHDR/dimensions validation before checkpoint/upload.
- Windows staging compile and combined suite: **22/22 PASS**.
- Evidence: `reports/worker/CWS_WORKER_OUTPUT_INTEGRITY_2026-08-05.md`.
- Classification: CODE/UNIT VERIFIED and Windows runtime validator verified; production/B2 E2E remains UNVERIFIED/BLOCKED.


## Worker P0 update â€” timeout cleanup (2026-08-05)

- Blender render subprocess supervision now has bounded timeout and Windows process-tree cleanup scoped to the owned PID.
- Windows staging compile + combined suite: **22/22 PASS**.
- Evidence: `reports/worker/CWS_WORKER_TIMEOUT_CLEANUP_2026-08-05.md`.
- Live timeout runtime test: UNVERIFIED; production/B2 E2E remains BLOCKED.


## Worker P0 update â€” capability preflight (2026-08-05)

- Dynamic JobSpec VRAM/RAM minimums and Worker-side final capability guard implemented.
- Windows staging compile + combined suite: **24/24 PASS**.
- Evidence: `reports/worker/CWS_WORKER_CAPABILITY_PREFLIGHT_2026-08-05.md`.
- Actual hardware capability discovery and production/B2 E2E remain UNVERIFIED/BLOCKED.


## Worker/Node Agent runtime integration update â€” 2026-08-05

- Windows staging real runtime: Node Agent â†’ child Generic Worker â†’ Blender 5.2 â†’ output integrity â†’ filesystem checkpoint â†’ cleanup â†’ ACTIVE_IDLE: **REAL RUNTIME VERIFIED**.
- Crash-once recovery: **REAL RUNTIME VERIFIED**.
- One-second timeout/process cleanup: **REAL RUNTIME VERIFIED** after fixing a staging harness hang.
- Hardware: RTX 2060 SUPER 8192 MiB, driver 576.88; RAM â‰ˆ16 GiB.
- Supabase lease/heartbeat and B2 staging upload/resume: **BLOCKED**; no isolated staging-safe credential/endpoint.
- Evidence: `reports/worker/CWS_WORKER_WINDOWS_RUNTIME_INTEGRATION_2026-08-05.md`.


## Staging E2E integration update â€” 2026-08-05

- Added credential-gated Supabase RPC and B2 S3-compatible staging adapters.
- Adapter tests + Worker suite: **26/26 PASS** on Windows Python runtime.
- No staging variables are currently present on this machine.
- Supabase/B2 FULL E2E: **BLOCKED** pending separate staging project, assignment JobSpec contract, bucket/prefix and least-privilege credentials.
- Evidence/Owner action: `reports/worker/CWS_STAGING_E2E_CONTRACT_2026-08-05.md`.

## New Windows machine context recovery â€” 2026-08-05

- Official `cws-portal` recovered from GitHub `main` at `72a175ba`; no duplicate checkout found.
- User-scoped Git and Python 3.12.10 were prepared; Node 24.19.0/npm 11.17.0 were already present.
- Generic Worker/Node Agent offline suite: **28/28 PASS** after fixing two existing verification defects (PNG signature literal and test syntax/timing).
- Blender, Supabase CLI, B2 credentials and staging variables remain absent; this is machine readiness, not staging E2E.
- Evidence: `reports/worker/CWS_NEW_MACHINE_CONTEXT_RECOVERY_2026-08-05.md`.
- Next: real isolated staging E2E when staging artifacts and credentials are present.

## Staging blocker audit â€” 2026-08-05

- Machine-safe env inspection: no `CWS_STAGING_*`, Supabase, B2, AWS or S3 values present.
- Supabase connector: exactly one non-staging project visible; it was not queried or mutated.
- Existing claim RPC returns insufficient fields for a complete dynamic JobSpec; no inference was made.
- Added staging-only migration/RPC `worker_migrations/016_staging_job_assignment_contract.sql`; code/test verified, not yet applied or runtime-verified in Supabase staging.
- B2 staging bucket/prefix/application key is absent.
- Evidence: `reports/worker/CWS_STAGING_BLOCKER_AUDIT_2026-08-05.md` and `reports/worker/CWS_STAGING_ASSIGNMENT_RPC_IMPLEMENTATION_2026-08-05.md`.
- Next: Owner supplies isolated staging project + assignment contract and B2 scoped key; then run FULL E2E immediately.

## FULL staging E2E â€” REAL RUNTIME VERIFIED â€” 2026-08-05

- Supabase staging assignment â†’ Node Agent â†’ Generic Worker Engine â†’ Blender 5.2 â†’ output integrity â†’ B2 staging checkpoint/HEAD+SHA-256 â†’ Supabase completion â†’ cleanup â†’ ACTIVE_IDLE: **REAL RUNTIME VERIFIED**.
- Job `staging-safe-20260805-01`, task `1`, worker `cws-staging-worker-01`, generation `3`; no production endpoint or `cws_worker_full.py` runtime used.
- Evidence: `reports/worker/CWS_STAGING_FULL_E2E_REAL_RUNTIME_VERIFIED_2026-08-05.md`.

## P0 follow-up â€” Admin / multi-node / isolation â€” 2026-08-05

- Admin Fleet real runtime: **BLOCKED/UNVERIFIED**. Code maps fresh heartbeat/lifecycle states and enforces AAL2, but staging has no `staff_roles`/`staff_worker_access` rows; no bypass or fake heartbeat was added.
- Multi-node assignment/failover: **REAL RUNTIME VERIFIED** on staging. Evidence: `reports/worker/CWS_MULTI_NODE_FAILOVER_REAL_RUNTIME_VERIFIED_2026-08-05.md`.
- Hostile `.blend` isolation: **UNVERIFIED/BLOCKED** pending a disposable Windows Sandbox-capable staging host. Evidence: `reports/worker/CWS_HOSTILE_BLEND_ISOLATION_POC_2026-08-05.md`.
- Production rollout: **NO-GO** until Admin AAL2 runtime, deployment, isolation, credential, monitoring and rollback gates pass. Checklist: `reports/worker/CWS_PRODUCTION_ROLLOUT_READINESS_2026-08-05.md`.

## Admin/Auth and isolation follow-up â€” 2026-08-05

- Staging Admin RBAC migration `017_staging_admin_rbac_contract.sql`: **REAL STAGING SCHEMA VERIFIED**; exact application contract, RLS enabled, no client policies.
- Admin Fleet through real UI: **BLOCKED/UNVERIFIED** pending Owner-created staging Auth identity, MFA enrollment/AAL2 session, and server-only staging backend configuration. Evidence: `reports/worker/CWS_ADMIN_FLEET_STAGING_AUTH_BLOCKER_2026-08-05.md`.
- Isolation alternative: **PARTIAL REAL RUNTIME VERIFIED** for Job Object timeout/child cleanup; filesystem boundary and network restriction remain **UNVERIFIED/BLOCKED**. Evidence: `reports/worker/CWS_HOSTILE_BLEND_ISOLATION_POC_2026-08-05.md`.
