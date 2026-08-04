## MVP V2 Roadmap Sync (2026-08-04)

ÄÃ£ táº¡o `CWS_ROADMAP_MVP_V2.md` vÃ  source reconciliation report tá»« V1, DECISIONS, PROJECT_CONTEXT, CWS_MVP_WORKFLOW_FINAL, CWS_WORKER_ROADMAP, toÃ n bá»™ `reports/customer/` vÃ  evidence/PR má»›i nháº¥t trÃªn GitHub.

V2 giá»¯ nguyÃªn V1 vÃ  khÃ´ng tÃ­nh PR chÆ°a merge vÃ o tráº¡ng thÃ¡i PASS. CÃ¡c gap Æ°u tiÃªn cÃ²n láº¡i:

- Worker production path claim + B2 upload + Blender/Fleet E2E tháº­t.
- Resume upload, early `.blend` validation, draft preservation vÃ  áº©n nguá»“n upload chÆ°a hoáº¡t Ä‘á»™ng.
- Price estimate/breakdown/cap, live payment/recovery/refund policy.
- Retention/privacy/terms vÃ  support channel/ticket.
- Preview runtime/edit-request state.
- Admin MFA tháº­t vÃ  xá»­ lÃ½ job/payment/support bá»‹ káº¹t.
- Full E2E vÃ  pilot khÃ¡ch tháº­t.

**MVP V2 hiá»‡n chÆ°a hoÃ n thÃ nh.** CÃ¡c má»¥c cáº§n Owner Ä‘Æ°á»£c ghi rÃµ trong roadmap; khÃ´ng tá»± bá»‹a giÃ¡, SLA, retention, refund, support hoáº·c customer metrics.

Evidence: `reports/CWS_MVP_V2_SOURCE_RECONCILIATION_2026-08-04.md`.

# Current Status

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

## Latest Audit Loop â€” 2026-08-04

ÄÃ£ sá»­a GAP nguá»“n file khÃ´ng trung thá»±c: `UploadScreen`, `GoogleDriveModal`, `fileUtils` vÃ  `renderConstants` hiá»‡n chá»‰ quáº£ng bÃ¡/validate Google Drive cho nguá»“n link; upload trá»±c tiáº¿p `.blend` váº«n Ä‘Æ°á»£c giá»¯. OneDrive/Dropbox/Direct Link chÆ°a cÃ³ Backend resolver tháº­t nÃªn khÃ´ng cÃ²n Ä‘Æ°á»£c nháº­n á»Ÿ UI. Evidence: `reports/CWS_UPLOAD_SOURCE_TRUTH_EVIDENCE_2026-08-04.md`.

ÄÃ¢y lÃ  PASS á»Ÿ má»©c code/static consistency, chÆ°a pháº£i Full E2E production. Upload resume, `.blend` inspection sÃ¢u, OAuth draft persistence, Worker/B2 runtime vÃ  Full E2E váº«n cÃ²n.

## P0 Security Audit Loop â€” 2026-08-04

ÄÃ£ audit RoleGuard/RBAC, customer ownership, WebSocket owner check, Host worker filtering, B2 signed URL, RLS, file intake, logs vÃ  legacy admin-key paths.

ÄÃ£ code trÃªn branch hiá»‡n táº¡i:

- POST /jobs, POST /files/upload, POST /drive/resolve yÃªu cáº§u Supabase Bearer customer há»£p lá»‡.
- Job khÃ´ng cÃ³ customer_id hoáº·c khÃ´ng khá»›p customer token bá»‹ tá»« chá»‘i á»Ÿ JobsService.assertOwnership.
- GET /jobs/:id/logs yÃªu cáº§u Admin RoleGuard + MFA; customer khÃ´ng cÃ²n Ä‘á»c worker logs.
- Host dashboard tiáº¿p tá»¥c lá»c theo staff_worker_access; Fleet/Admin routes dÃ¹ng RoleGuard backend.
- Existing RLS, signed URL TTL vÃ  WebSocket owner checks Ä‘Æ°á»£c giá»¯ vÃ  ghi nháº­n trong evidence.

Payment detail ownership cÅ©ng Ä‘Ã£ Ä‘Æ°á»£c khÃ³a: direct unauthenticated payment creation bá»‹ gá»¡ khá»i controller; GET payment yÃªu cáº§u customer Bearer vÃ  Ä‘á»‘i chiáº¿u owner qua render_orders.customer_id.

Tráº¡ng thÃ¡i: **CODE PASS / RUNTIME CHÆ¯A XÃC MINH**. Cáº§n cháº¡y Jest/build vÃ  kiá»ƒm thá»­ báº±ng hai tÃ i khoáº£n tháº­t Ä‘á»ƒ chuyá»ƒn P0 sang runtime PASS.

RLS P0 fix: added backend/migrations/016_enable_customer_rls_boundaries.sql to explicitly enable RLS on customer and internal tables without deleting data/policies.

Upload safety fix: direct .blend intake now rejects renamed/non-native files missing the BLENDER signature before B2 upload; focused unit tests were added. Upload UI cÅ©ng hiá»ƒn thá»‹ cÃ´ng khai giá»›i háº¡n `.blend` only, 2GB vÃ  Google Drive-only link source trÆ°á»›c khi khÃ¡ch tiáº¿p tá»¥c. Progress UI hiá»ƒn thá»‹ queue delay tá»« `queueSeconds` khi Backend tráº£ vá». Upload draft `.blend` Ä‘Æ°á»£c lÆ°u táº¡m IndexedDB qua OAuth redirect vÃ  khÃ´i phá»¥c sau login; khÃ´ng lÆ°u credential/token. Worker frame timeout Ä‘Ã£ Ä‘Æ°á»£c thÃªm vÃ o `cws_worker_full.py` qua `CWS_FRAME_TIMEOUT_SEC`, kÃ¨m cleanup output khi timeout.

Evidence: reports/customer/CWS_BLEND_EARLY_VALIDATION_2026-08-04.md.

Evidence: reports/security/CWS_P0_BOUNDARY_AUDIT_2026-08-04.md.

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

## Last Updated

2026-08-03 â€” xem `reports/worker/CWS_P0_SECURITY_FIX_2026-08-03.md`
(P0 fix má»›i nháº¥t, commit `109d258`), commit `27a10f4` (PaymentScreen
UX fix), `reports/customer/CWS_CUSTOMER_OBJECTION_DESIRE_RESEARCH_300.md`
(Æ°u tiÃªn hoÃ¡ task theo insight khÃ¡ch hÃ ng),
`reports/admin/CWS_ADMIN_MFA_IMPLEMENTATION_2026-08-02.md` (Admin MFA),
`reports/worker/CWS_WORKER_READINESS_AUDIT_2026-08-02.md` (Worker
audit gá»‘c), `reports/CURRENT_STATUS_ARCHIVE_2026-08-02.md` (lá»‹ch sá»­
Ä‘áº§y Ä‘á»§ trÆ°á»›c khi file nÃ y Ä‘Æ°á»£c rÃºt gá»n).


## Edit Request State â€” 2026-08-04

ÄÃ£ hoÃ n thiá»‡n gap P1 vá» yÃªu cáº§u chá»‰nh sá»­a: migration 017 + repository/service lÆ°u tráº¡ng thÃ¡i REQUESTED, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, DECLINED, ngÆ°á»i xá»­ lÃ½ vÃ  thá»i gian pháº£n há»“i dá»± kiáº¿n. Customer Ä‘á»c qua GET /jobs/:id/edit-requests sau ownership check; Admin xem/cáº­p nháº­t qua /staff/edit-requests vá»›i RoleGuard + MFA backend. RLS chá»‰ cho customer Ä‘á»c request cá»§a chÃ­nh mÃ¬nh. Evidence: reports/security/CWS_EDIT_REQUEST_STATE_2026-08-04.md; contract test: backend/src/security/p0-boundary.contract.spec.ts. Tráº¡ng thÃ¡i: CODE/TEST PASS, runtime hai tÃ i khoáº£n/MFA chÆ°a xÃ¡c minh.


## CI Verification â€” 2026-08-04

GitHub Actions run #202 (head a1dbffe) PASS: Backend build + 18 Jest suites/123 tests, Frontend build + lint. ÄÃ¢y lÃ  evidence code/build/test; chÆ°a thay tháº¿ runtime hai tÃ i khoáº£n, RLS/MFA tháº­t, Worker/B2 váº­t lÃ½ hoáº·c Full E2E. Chi tiáº¿t: reports/CWS_CI_VERIFICATION_2026-08-04.md.

Latest CI recheck: GitHub Actions run #204 (head 750916c) PASS sau khi chá»‰nh comment auth controller; backend build/test vÃ  frontend build/lint Ä‘á»u PASS.


## Resumable Upload â€” 2026-08-04

ÄÃ£ thay upload má»™t láº§n báº±ng B2 multipart: chunk 8MiB, session/ETag lÆ°u Supabase, customer ownership + RLS, resume qua sessionStorage, kiá»ƒm tra BLENDER header á»Ÿ chunk Ä‘áº§u, vÃ  cleanup session ACTIVE quÃ¡ 24 giá». CI #215 PASS (backend build/tests, frontend build/lint). Runtime máº¥t máº¡ng/resume trÃªn B2 tháº­t vÃ  browser quota chÆ°a xÃ¡c minh. Evidence: reports/customer/CWS_RESUMABLE_UPLOAD_2026-08-04.md.


## Worker Cleanup â€” 2026-08-04

ÄÃ£ sá»­a Worker Ä‘á»ƒ reset output local trÆ°á»›c attempt vÃ  cleanup sau success/fail/partial/retry; chá»‰ local task output bá»‹ xÃ³a, khÃ´ng Ä‘á»¥ng B2/production. Python static contract + CI #219 PASS; disk-before/after trÃªn Worker Windows tháº­t chÆ°a xÃ¡c minh. Evidence: reports/worker/CWS_WORKER_LOCAL_CLEANUP_2026-08-04.md.


## Admin Edit Request Queue â€” 2026-08-04

Admin Dashboard Ä‘Ã£ Ä‘Æ°á»£c ná»‘i vá»›i queue yÃªu cáº§u chá»‰nh sá»­a: táº£i danh sÃ¡ch qua GET /staff/edit-requests, hiá»ƒn thá»‹ job/requester/note/status vÃ  cáº­p nháº­t tráº¡ng thÃ¡i qua PATCH /staff/edit-requests/:id. Backend váº«n enforce RoleGuard + MFA; Customer/Host khÃ´ng Ä‘Æ°á»£c cáº¥p quyá»n tá»« UI. Evidence: reports/admin/CWS_ADMIN_EDIT_REQUEST_QUEUE_2026-08-04.md. Tráº¡ng thÃ¡i: CODE PASS, cáº§n CI má»›i nháº¥t vÃ  tÃ i khoáº£n staff MFA tháº­t Ä‘á»ƒ runtime verify.


## Admin Security Hardening â€” 2026-08-04

Admin edit-request queue Ä‘Ã£ Ä‘Æ°á»£c hiá»ƒn thá»‹/cáº­p nháº­t trong Dashboard qua route MFA/RBAC backend. Äá»“ng thá»i sá»­a Admin download Ä‘á»ƒ khÃ´ng Ä‘áº·t Bearer token trong query string: request dÃ¹ng Authorization header vÃ  blob URL táº¡m, tá»± revoke. Evidence: reports/admin/CWS_ADMIN_EDIT_REQUEST_QUEUE_2026-08-04.md vÃ  reports/security/CWS_ADMIN_DOWNLOAD_TOKEN_HANDLING_2026-08-04.md. Tráº¡ng thÃ¡i: CODE PASS, runtime browser/MFA chÆ°a xÃ¡c minh.


CI #228 (head 5c90d7d) PASS: backend build/test vÃ  frontend build/lint sau Admin edit-request queue + token handling fixes. ÄÃ¢y váº«n lÃ  code/test evidence; chÆ°a thay tháº¿ staff MFA/browser runtime, hai tÃ i khoáº£n RLS, Worker/B2 váº­t lÃ½ hoáº·c Full E2E.


## Payment Confirmation Boundary â€” 2026-08-04

ÄÃ£ loáº¡i bá» POST /payments/:id/confirm khÃ´ng cÃ³ guard. Provider QR tá»«ng tá»« chá»‘i direct confirm, nhÆ°ng route váº«n lÃ  attack surface khÃ´ng cáº§n thiáº¿t. Contract test má»›i khÃ³a ráº±ng chá»‰ webhook cÃ³ guard Ä‘Æ°á»£c dÃ¹ng Ä‘á»ƒ xÃ¡c nháº­n thanh toÃ¡n. Evidence: reports/security/CWS_PAYMENT_CONFIRMATION_BOUNDARY_2026-08-04.md. Chá» CI má»›i nháº¥t Ä‘á»ƒ xÃ¡c nháº­n build/test.

CI #230 (code head 46e5c1c) PASS sau payment confirmation boundary fix: backend build/test vÃ  frontend build/lint. Docs-only status commits sau Ä‘Ã³ khÃ´ng thay Ä‘á»•i code. Live payment váº«n cáº§n Owner xÃ¡c minh.


Admin token hardening tiáº¿p tá»¥c: staff-auth backend hiá»‡n chá»‰ nháº­n Authorization Bearer header vÃ  tá»« chá»‘i query-only staffToken; test Ä‘Ã£ cáº­p nháº­t. Evidence: reports/security/CWS_ADMIN_DOWNLOAD_TOKEN_HANDLING_2026-08-04.md.

CI #234 (code head 40a40dc) PASS sau staff-auth query-token rejection: backend build/test vÃ  frontend build/lint. P0 payment + token-boundary contract coverage hiá»‡n xanh á»Ÿ má»©c code/test.


## Final Safe-Code Audit Loop â€” 2026-08-04

ÄÃ£ rÃ  soÃ¡t láº¡i cÃ¡c boundary Customer/Host/Admin, payment confirmation, B2/signed URL, RLS, staff token handling vÃ  Admin UI. CÃ¡c GAP an toÃ n phÃ¡t hiá»‡n trong vÃ²ng nÃ y Ä‘Ã£ Ä‘Æ°á»£c code/test/evidence: bá» direct POST /payments/:id/confirm, tá»« chá»‘i query-string staffToken á»Ÿ backend, Admin edit-request queue, vÃ  download báº±ng Authorization header/blob URL. KhÃ´ng cÃ²n GAP MVP an toÃ n rÃµ rÃ ng cÃ³ thá»ƒ hoÃ n thiá»‡n mÃ  khÃ´ng cáº§n quyáº¿t Ä‘á»‹nh/credential/mÃ¡y runtime tháº­t.

CÃ²n láº¡i vÃ  Ä‘Æ°á»£c giá»¯ BLOCKED/OWNER hoáº·c runtime: Worker claim/B2/Windows-Blender E2E, browser resume thá»±c táº¿, live MB Bank/SePay, pricing/cap/SLA/refund, retention/legal/privacy/terms, support channel/ticket, staff MFA enrollment, Full E2E vÃ  pilot khÃ¡ch tháº­t. KhÃ´ng gá»i MVP hoÃ n thÃ nh.


## Support Ticket MVP â€” 2026-08-04

ÄÃ£ thÃªm support_tickets (migration 019), Customer ticket form/status list, Admin MFA/RBAC queue vÃ  contract test ownership/RLS. CI #249 PASS (backend build/test, frontend build/lint). Ticket workflow Ä‘Ã£ code/test nhÆ°ng kÃªnh liÃªn há»‡ tháº­t, ngÆ°á»i phá»¥ trÃ¡ch, giá» lÃ m viá»‡c vÃ  SLA váº«n lÃ  OWNER TODO; khÃ´ng quáº£ng cÃ¡o 24/7. Evidence: reports/support/CWS_SUPPORT_TICKET_MVP_2026-08-04.md.

CI #251 (code head c455005) PASS sau SupportService ownership/status unit tests: backend build/test vÃ  frontend build/lint. Support ticket code path Ä‘Ã£ Ä‘Æ°á»£c test á»Ÿ má»©c unit/contract; runtime hai tÃ i khoáº£n vÃ  kÃªnh pháº£n há»“i tháº­t váº«n chÆ°a xÃ¡c minh.

Admin Support queue bá»• sung trÆ°á»ng Ä‘áº·t expected response time theo tá»«ng ticket; khÃ´ng tá»± Ä‘áº·t SLA máº·c Ä‘á»‹nh. CI #253 PASS trÃªn code head 1023268.


## HTTP/WebSocket Token Boundary â€” 2026-08-04

ÄÃ£ Ä‘Ã³ng bearer-token query path: Customer/Admin download dÃ¹ng Authorization header + blob URL; HTTP helper tá»« chá»‘i query bearer; WebSocket dÃ¹ng one-time opaque ticket hash trong DB, TTL 60 giÃ¢y, consume-once. TTL download UI sá»­a thÃ nh 5 phÃºt Ä‘Ãºng Backend. CI #266 PASS; production migration/browser/two-account runtime chÆ°a xÃ¡c minh. Evidence: reports/security/CWS_HTTP_WS_TOKEN_BOUNDARY_2026-08-04.md.

Download flow tiáº¿p tá»¥c Ä‘Æ°á»£c harden: thÃªm GET /jobs/:id/download-url, xÃ¡c thá»±c Bearer header, tráº£ signed URL TTL 5 phÃºt Ä‘á»ƒ Ä‘iá»u hÆ°á»›ng trá»±c tiáº¿p B2, trÃ¡nh fetch redirect/CORS. CI #272 PASS; migration 020 vÃ  browser/two-account runtime váº«n cáº§n xÃ¡c minh.
# 2026-08-04 â€” Admin Google OAuth + Vercel audit

- Implemented Admin Google OAuth through the existing Supabase Auth client on `agent/roadmap-mvp-v2`.
- Added server-side `GET /staff/access` preflight against `staff_roles`; normal Google users are denied before MFA.
- Existing Admin API authorization remains `RoleGuard` + `staff_roles` + Supabase `aal2`; OAuth does not bypass MFA.
- Added targeted server-side allow/deny tests and evidence: `reports/evidence/ADMIN_GOOGLE_OAUTH_AUDIT_2026-08-04.md`.
- Vercel audit found six CWS-named projects. `cws-portal.vercel.app` remains attached to project `cws-portal`; duplicate project deletion was not performed because repository/domain/environment use could not be proven absent.
- OWNER TODO: enable/verify Google provider callback in Supabase, provision the real Admin Google user in `staff_roles`, enroll TOTP MFA, and perform live OAuth test.
- Production merge/deploy remains BLOCKED until Vercel build-rate-limit is resolved and live auth/runtime checks pass.
