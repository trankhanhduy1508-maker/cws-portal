# Current Status

## Architecture V1 bounded Worker enrollment — 2026-08-08

- **P1A CODE/UNIT VERIFIED**: Admin Google+TOTP/AAL2 can issue a hash-only
  batch of 1–100 short-lived, one-time tickets bound to stable Worker IDs.
  Windows enrollment generates the final credential locally, stores it with
  DPAPI/ACL and atomically redeems through Backend; no per-Worker SQL edit,
  global fleet secret, B2 key or Supabase service role is used.
- **PRODUCTION SCHEMA VERIFIED**: migration 026 is applied. Ticket RLS/grants
  are service-role-only; `anon/authenticated` cannot read tickets or execute
  consume. A rollback-scoped transaction verified first consume, idempotent
  same-credential retry and rejection of changed-credential replay. Zero real
  tickets were issued; MAY083's existing identity remains unchanged.
- **100-WORKER CODE SIMULATION VERIFIED**: stable ID-derived startup jitter
  spreads heartbeat/claim startup over five seconds. Worker suite is 85/85;
  Backend is 38 suites / 195 tests and build PASS.
- **DEPLOYMENT/RUNTIME VERIFIED FOR PREVIOUS MILESTONE**: Vercel production is
  READY on `5cee323f04388ef3df56bcf63c423290b4c53f34`; live Backend rejects
  anonymous upload with 401. Authenticated MAY083 B2-only `--once` refreshed
  heartbeat and claimed no incompatible Drive backlog.
- **BACKEND DEPLOYED/RUNTIME GUARDS VERIFIED**: live `/health=200`; anonymous
  ticket issuance and malformed redemption both return 401. No ticket or test
  identity was created by these smoke checks.
- **LOCAL NEST LOAD REGRESSION VERIFIED**: authenticated, ownership-bound
  10/25/50/100-customer scenarios PASS. At 100 jobs: 0 submit errors, 0
  duplicate claims, one failover and one stale completion rejection. This is
  simulated local evidence, not production capacity PASS.
- **NEXT / NEEDS_VERIFICATION**: P3 requires one real authenticated customer
  `.blend`/`.zip` B2 upload/task. No physical second-Worker enrollment or
  Blender/B2 completion is claimed.
- Evidence: `reports/security/CWS_BOUNDED_WORKER_ENROLLMENT_2026-08-08.md`.

## Architecture V1 P0/P1 reconciliation — 2026-08-08

- **PRODUCTION SCHEMA VERIFIED**: additive migrations
  `input_upload_ownership`, `worker_input_capability_claim` and
  `internal_rpc_gateway_hardening` are applied to canonical Supabase.
- **P0 SECURITY FIXED**: upload and job creation require authenticated Google/
  Supabase customer identity. Backend binds each B2 upload key to its owner and
  refuses cross-customer `fileRef` dispatch. Production ACL verification shows
  `input_uploads` is inaccessible to `anon/authenticated` and available only to
  Backend `service_role`.
- **P0 WORKER RPC FIXED**: every remaining internal `SECURITY DEFINER` fleet
  function is no longer executable by `anon/authenticated`; a production
  catalog query returned zero exposed functions after migration.
- **P1 CLAIM FIXED**: atomic resilient claim now receives a strict input-source
  allowlist. A B2-only Worker cannot claim historical Google Drive tasks;
  capability matching remains inside PostgreSQL `FOR UPDATE SKIP LOCKED`.
- **CODE/UNIT VERIFIED**: Backend 37 suites / 190 tests + build, Worker 78/78,
  Frontend 13/13 + lint/build PASS.
- **DEPLOYED/READ-ONLY VERIFIED**: Vercel production is READY on commit
  `5cee323f04388ef3df56bcf63c423290b4c53f34`; Backend anonymous upload now
  returns 401. A real customer ownership smoke still requires a Google session.
- Evidence:
  `reports/security/CWS_ARCHITECTURE_V1_P0_P1_RECONCILIATION_2026-08-08.md`.

## Production E2E Roadmap V2.3 P1 storage boundary — 2026-08-08

- **CODE/UNIT VERIFIED**: the authenticated Worker gateway now issues
  120-second, exact-object Backblaze B2 S3-compatible presigned GET/PUT
  capabilities only after the requesting Worker is confirmed to own the
  current task generation. Input is restricted to the claimed `.blend`/`.zip`;
  output is restricted to assigned frames with attempt/generation/size/SHA-256
  metadata.
- **SECURITY BOUNDARY VERIFIED IN CODE**: long-lived B2 credentials remain in
  Backend configuration. Worker keeps only its per-Worker HMAC credential under
  DPAPI; no Supabase `service_role`, B2 key, shared fleet secret, manual
  per-Worker B2 action or manual per-job action is required.
- **WORKER CONTRACT UPDATED**: canonical Node Agent requests capabilities from
  Backend, validates HTTPS Backblaze host/method/expiry/headers, streams bounded
  transfers, and no longer requires `CWS_B2_*` runtime values.
- **NEEDS RUNTIME VERIFICATION**: production deployment, a claimed task, real
  B2 GET/PUT, persistent P2 heartbeat and P3 Blender run are not runtime PASS.
- **PRODUCTION GATE PARTIAL**: Render serves `/health` 200 and the new storage
  endpoint rejects anonymous access with 401; authenticated MAY083 reaches the
  route and receives the expected 400 because it owns no current assignment.
  A signed `worker_ping` advanced production `last_seen_at` to
  `2026-08-08 03:57:49.917489+00` and `status=idle`.
- **P2 DEFECT RUNTIME VERIFIED**: idle state reporting returned 400
  because the Backend gateway incorrectly required task/generation for
  `report_worker_state_transition`. The gateway now accepts taskless
  `ACTIVE_IDLE`, strictly allowlists states, and rejects forged task/reason
  fields. After deployment, authenticated MAY083 transition passed and
  production recorded `observed_state=ACTIVE_IDLE` at
  `2026-08-08 04:03:10.083518+00`. Persistent autonomous heartbeat is still
  **NEEDS_VERIFICATION**; this single transition is not a P2 completion claim.
- **P3 INPUT CONTRACT FIXED/CODE VERIFIED**: the capability issuer now accepts
  the repository's canonical uploaded-file URI (`b2://uploads/<key>`) while
  limiting input to `uploads/` `.blend`/`.zip` objects. Other prefixes such as
  `final/` are rejected. Production B2 transfer remains unverified.
- **P2 AUTONOMOUS HEARTBEAT RUNTIME VERIFIED**: canonical
  `production_node_agent.py --heartbeat-only` is running independently as PID
  3208 on MAY083. Two production reads more than one heartbeat cycle apart show
  `last_seen_at` advancing from `2026-08-08 04:10:26.544626+00` to
  `2026-08-08 04:11:29.66472+00`, with `status=idle`,
  `observed_state=ACTIVE_IDLE`, `current_task_id=null`. This mode intentionally
  does not claim; normal claim/render is P3.
- Evidence: `reports/evidence/CWS_PRODUCTION_E2E_V2_3_P2_AUTONOMOUS_HEARTBEAT_2026-08-08.md`.
- Evidence: `reports/security/CWS_JOB_SCOPED_B2_CAPABILITY_2026-08-08.md`.

## Production E2E Roadmap V2.2 P1 — 2026-08-08 (SUPERSEDED BY V2.3)

- **PRODUCTION IDENTITY VERIFIED**: MAY083 now has stable Worker ID
  `CWS-BAE2782D20525D46` in fleet 2 with RTX 2060 SUPER / 8192 MB metadata.
  Its unique token is DPAPI-protected on MAY083; production stores only the
  SHA-256 verifier and an expiry/revocation record.
- **AUTHENTICATED RUNTIME EVIDENCE**: a signed request through the canonical
  Backend Worker RPC gateway returned success and production
  `workers.last_seen_at` advanced to `2026-08-08 02:49:11.367046+00`.
  This proves identity/RPC wiring, but is not a claim or render PASS.
- **LOCAL PREFLIGHT PARTIAL**: Blender 5.2.0 LTS, GPU detection, Python 3.12,
  boto3 runtime and credential ACL are verified. Non-secret production config
  is present. The temporary hash-only SQL artifact was removed after apply.
- **OBJECTIVE BLOCKER**: MAY083 has no scoped production B2 credential;
  `CWS_B2_KEY_ID` and `CWS_B2_APP_KEY` are absent in process/user/machine env,
  the Worker package and local CWS stores. Canonical Node Agent fails closed at
  `missing production configuration: CWS_B2_KEY_ID`, so P1/P2/P3 are not DONE.
- Evidence: `reports/evidence/CWS_PRODUCTION_E2E_V2_2_P1_MAY083_PROVISIONING_2026-08-08.md`.

## Production E2E Roadmap V2.2 P0 — 2026-08-08

- **RUNTIME VERIFIED / DONE**: production migrations 020/021/022, required
  Worker tables/columns/RPCs, counts and backend health were checked directly.
- **P0 SECURITY FIXED**: historical direct Worker RPC execution by
  `anon`/`authenticated` was revoked by production migration
  `worker_rpc_gateway_only` (`20260808023827`); `service_role` remains allowed
  for the authenticated Backend gateway and all covered functions have pinned
  `search_path`.
- **SUPERSEDED BY P1 ABOVE**: production no longer has zero Worker identities;
  the first MAY083 identity is provisioned and B2 is the next real gate.
- Evidence: `reports/evidence/CWS_PRODUCTION_E2E_V2_2_P0_REALITY_CHECK_2026-08-08.md`.

## Production worker auto-provision gate — 2026-08-07

- **READ-ONLY VERIFIED**: production Supabase project `ynhxlxetwuiyejcjypsi`
  currently has 29 `workers`, 0 `worker_identities`, 0 `worker_leases`, and 0
  workers with `last_seen_at` in the last two minutes. `public.workers` has no
  hostname or device-fingerprint mapping for `MAY083`.
- **CODE VERIFIED**: the canonical Node Agent intentionally requires an
  explicit `CWS_WORKER_ID` plus a per-worker DPAPI credential and sends only
  authenticated RPCs. It does not auto-register from hostname/GPU. The legacy
  caller-supplied `register_worker` path is not a safe bootstrap mechanism.
- **BLOCKED**: safe first-run auto-bind needs an approved bootstrap trust
  anchor. No identity, secret, job, B2 object, or production mutation was
  created in this check.
- Evidence: `CWS_PROVISIONING_AUTO_BIND_GATE_2026-08-07.md`.

## B2-only Worker input path — 2026-08-07

- **FIXED/CODE VERIFIED**: B2-backed JobSpecs no longer require
  `CWS_GOOGLE_DRIVE_API_KEY`; Drive input still fails closed when its key is
  absent.
- Evidence: `reports/worker/CWS_B2_ONLY_INPUT_PATH_2026-08-07.md`.

## Current production real-path audit — 2026-08-07

- **READ-ONLY VERIFIED**: canonical Vercel production is `cws-portal`, READY on `main` commit `7444797`; live bundle calls the real Render backend and real WebSocket, with Supabase auth enabled and development mock auth disabled.
- **CODE VERIFIED**: upload/Drive → `POST /jobs` → durable `render_orders` + Worker Fleet task → server WebSocket status/result; no active fake progress path was found in production.
- **BLOCKED/NOT VERIFIED**: production Supabase has 0 `worker_identities`, 0 fresh heartbeats, 0 leases and 247 open tasks. No physical Worker claim, Blender process, B2 output or customer download was produced.
- Evidence: `reports/evidence/CWS_PRODUCTION_REAL_PATH_AUDIT_2026-08-07_ADDENDUM.md`.

## Physical Worker readiness audit — 2026-08-07

- **CODE/LOCAL VERIFIED**: MAY083 has the canonical Node Agent package and
  Blender 5.2.0; production RPC routines required for claim/heartbeat/spec and
  completion exist in Supabase.
- **BLOCKED BEFORE HEARTBEAT**: production has 0 worker identities and 0 fresh
  workers; MAY083 has no `CWS_*` runtime configuration or DPAPI credential.
  Local Worker Python now imports `boto3 1.43.66`; no job mutation was
  performed.
- Evidence: `reports/evidence/CWS_PRODUCTION_PHYSICAL_WORKER_READINESS_AUDIT_2026-08-07.md`.

## Vercel project consolidation audit — 2026-08-07

- Live lookup confirms canonical project `cws-portal`
  (`prj_oEEqu24zYqTq1p9FJhzkUake0pEi`) is the only project with alias
  `https://cws-portal.vercel.app`; six other CWS-named projects have separate
  `.vercel.app` domains.
- Repo/history audit found no Vercel project-creation script, `vercel.json`,
  committed `.vercel` link, or GitHub Actions deploy step. Deployment metadata
  shows duplicate projects Git-integrated to the same repo/main under the
  Vercel account. No deletion was attempted because this session has no
  Vercel write token/API and cannot compare encrypted env vars safely.
- Evidence: `reports/deployment/CWS_VERCEL_PROJECT_CONSOLIDATION_AUDIT_2026-08-07.md`.

## Worker/Node Agent production-path hardening — 2026-08-07

- **FIXED/CODE VERIFIED**: extension-neutral Drive download detection now
  accepts a real ZIP from a URL without a filename suffix and rejects HTML or
  invalid signatures before Blender.
- **FIXED/CODE VERIFIED**: B2 checkpoint resume/verify streams the remote
  object and recomputes SHA-256 instead of trusting metadata alone.
- **FIXED/CODE VERIFIED**: authenticated Node Agent state transitions report
  `ACTIVE_IDLE`, `PREPARING`, `RENDERING`, `RECOVERY` and `CLEANUP` through the
  existing RPC used by Admin fleet visibility.
- **VERIFIED**: Worker suite 69/69, backend 178/178 and backend build PASS;
  real local Blender/WorkerEngine verification is recorded separately.
- **NOT VERIFIED/BLOCKED**: physical authenticated production Worker,
  Supabase claim/heartbeat, B2 production object and customer/payment E2E.
- Evidence: `reports/worker/CWS_WORKER_NODE_AGENT_PRODUCTION_PATH_HARDENING_2026-08-07.md`.

## Production Worker auto-bind audit — 2026-08-07

- **READ-ONLY VERIFIED**: production Supabase has 29 Worker rows, 0
  `worker_identities`, 0 `worker_leases`, 0 fresh heartbeat rows, and no
  hostname/machine-fingerprint field. All observed `boot_id`/`session_id`
  values are null; no Worker ID maps verifiably to `MAY083`.
- **CODE VERIFIED**: the canonical Node Agent requires explicit
  `CWS_WORKER_ID` plus DPAPI credential and only sends authenticated
  `worker_ping`; it has no auto-register/auto-bind path. The legacy
  `register_worker` RPC accepts a caller-supplied ID and is not a secure host
  identity mechanism.
- **BLOCKED**: no Worker ID was selected or guessed. Auto-binding requires an
  approved bootstrap identity contract before MAY083 can heartbeat or claim.
- Evidence: `reports/evidence/CWS_PRODUCTION_WORKER_AUTO_BIND_AUDIT_2026-08-07.md`.

## Legacy/production Worker feature parity — 2026-08-07

- **CODE/UNIT VERIFIED**: pinned Blender bootstrap, read-only scene preflight,
  generic render execution, checkpoint/integrity handling and authenticated
  dynamic Node Agent are on the canonical production path.
- **CODE VERIFIED**: best-effort redacted CPU/RAM/GPU/PID telemetry is recorded
  outside the attempt workspace and cannot change job/payment state.
- **NOT VERIFIED/BLOCKED**: no physical Worker has claimed a production task,
  launched real Blender, uploaded B2 output and reported completion.
- Matrix: `FEATURE_PARITY_LEGACY_VS_PRODUCTION.md`.

## Official Blender input fixture — 2026-08-07

- **CODE/TEST VERIFIED**: production downloader now rejects HTML/error payloads
  and validates `.blend`/`.zip` signatures; gzip-compressed Blender files are
  accepted only when their decompressed prefix is `BLENDER`.
- **INPUT VERIFIED**: official `download.blender.org/demo/color_vortex.blend`
  was downloaded and verified at 556,884 bytes after decompression with the
  recorded SHA-256.
- **BLOCKED/NOT VERIFIED**: physical Worker claim, Blender process, B2 output,
  backend completion and customer download still require production access.
- Evidence: `reports/worker/CWS_OFFICIAL_BLENDER_FIXTURE_VERIFICATION_2026-08-07.md`.

## Windows host render verification — 2026-08-07

- **REAL LOCAL RUNTIME VERIFIED**: Blender 5.2.0 LTS was installed from the
  official archive with verified SHA-256 and rendered the official fixture on
  this Windows host using a real Blender process/PID and EEVEE output.
- **PRODUCTION E2E BLOCKED**: no `CWS_*` production configuration or DPAPI
  Worker credential exists on this host, and the Desktop package lacks the
  canonical production Node Agent. No production job was created.
- Evidence: `reports/worker/CWS_PHYSICAL_WORKER_PRODUCTION_E2E_BLOCKER_2026-08-07.md`.

## Production E2E control-plane audit — 2026-08-07

- **RUNTIME READ-ONLY VERIFIED**: Render health/CORS and Supabase production
  health/schema preflight pass. Supabase currently reports 29 registered
  Workers, 0 fresh heartbeats and 247 open tasks.
- **BLOCKED**: production `worker_identities`, resilient claim and dynamic
  JobSpec RPCs from migrations 020/021/022 are absent; the Windows host has no
  Worker identity/B2 configuration. Vercel's latest observed READY deployment
  is also behind current HEAD.
- No production job or mutation was created in this audit.
- Evidence: `reports/evidence/CWS_PRODUCTION_E2E_CONTROL_PLANE_AUDIT_2026-08-07.md`.

## Production provisioning gate progress — 2026-08-07

- **RUNTIME VERIFIED**: migrations 020/021/022 applied to Supabase production;
  worker identity tables, resilient claim, dynamic JobSpec, fenced heartbeat,
  stale requeue and retry column all verify present.
- **LOCAL PACKAGE VERIFIED**: Desktop Worker package now contains the canonical
  `production_node_agent.py` and current runtime modules; Python compile passes.
- **FIXED/LOCAL RUNTIME VERIFIED**: direct Windows launcher execution now works
  with isolated Python; it reaches fail-closed production configuration
  validation instead of failing to import sibling Worker modules.
- **BLOCKED**: a real Worker ID must be explicitly mapped to this physical
  host, provisioned with a per-worker credential, and supplied with scoped B2
  runtime configuration. No identity or secret was guessed or created.

## Final provisioning blocker — 2026-08-07

- Host evidence: `MAY083`, NVIDIA GeForce RTX 2060 SUPER.
- Production registry has no machine/boot/session mapping for its 29 offline
  Worker IDs. No `CWS_*` production env or DPAPI credential exists locally.
- **BLOCKED** only at authorized Worker-ID binding and scoped B2 credential
  provisioning; migrations, package, Blender and launcher are ready.
- Evidence: `reports/evidence/CWS_PRODUCTION_PROVISIONING_GATE_FINAL_BLOCKER_2026-08-07.md`.

## Production Node Agent adapter preparation - 2026-08-07

- **IMPLEMENTED/CODE VERIFIED**: `worker/production_node_agent.py` is the
  canonical credential-gated loop. It uses DPAPI credential loading,
  authenticated backend RPC claim/heartbeat/stage/complete/fail calls,
  dynamic JobSpec retrieval, Drive/B2 input download, generic
  `worker_engine.py`, real Blender CLI with Job Object containment, and B2
  checkpoint upload/verification.
- **IMPLEMENTED/CODE VERIFIED**: `get_claimed_task_spec` is an authenticated,
  read-only, worker/generation-fenced RPC bridge. SQL is prepared in migration
  `worker_migrations/022_production_dynamic_task_spec_rpc.sql`; it has not been
  applied to production in this session.
- **IMPLEMENTED/CODE VERIFIED**: generic Engine checks the lease immediately
  before final completion, preventing stale attempts from finalizing after
  reassignment.
- **IMPLEMENTED/CODE VERIFIED**: output object prefixes are bounded relative
  paths and production input download is restricted to Google Drive/Google API
  HTTPS or the configured B2 bucket.
- **NEEDS_VERIFICATION/BLOCKED**: production migration apply, physical
  Windows/Blender runtime, Drive/B2 credentials, and real job evidence remain
  outstanding. No production job was created.
- Evidence: `reports/worker/CWS_PRODUCTION_NODE_AGENT_ADAPTER_2026-08-07.md`.

## Production pricing gate audit - 2026-08-07

- **FIXED/CODE VERIFIED**: final customer pricing now uses the approved
  `actual worker runtime cost x 2.5` formula, with a 6,000 VND/worker-hour
  host baseline. The previous multiplier `2` was corrected.
- **FIXED/CODE VERIFIED**: approval fails closed when no verified Worker
  execution or runtime heartbeat exists; it no longer creates a fallback price.
- **NEEDS_VERIFICATION**: production pricing still needs a real completed
  Worker execution and payment runtime. No production job or payment was
  created in this session.
- Evidence: `reports/evidence/CWS_PRODUCTION_E2E_PRICING_GATE_2026-08-07.md`.

## Production Node Agent / generic Worker audit — 2026-08-07

- **CODE VERIFIED**: canonical direction remains Node Agent → dynamic
  JobSpec/TaskSpec → `worker/worker_engine.py`; legacy `cws_worker_full.py` and
  `cws_worker.bat` are excluded from production.
- **FIXED**: downloaded package contract had a wrong entrypoint path and stale
  SHA-256 manifest. Launcher now validates `worker/worker_engine.py` and the
  manifest hashes match the checked-in generic package.
- **FIXED/CODE VERIFIED**: Google Drive folder resolution now selects exactly
  one direct `.blend`/`.zip` child and returns its canonical file link. The
  supplied folder has one valid `.blend` according to authenticated Drive
  listing.
- **NOT VERIFIED**: repository still has no production long-running Node Agent
  adapter that authenticates, claims a dynamic task, wires B2/Drive download and
  progress/checkpoint RPCs into `worker_engine.py`, then launches real Blender.
  Render has deployed the new folder resolver, but the supplied folder call
  returns HTTP 400 because production `GOOGLE_DRIVE_API_KEY` is not configured.
  No production E2E claim is made.
- Evidence: `reports/worker/CWS_PRODUCTION_NODE_AGENT_GENERIC_WORKER_AUDIT_2026-08-07.md`.

## Production real-path audit — 2026-08-07

- **CODE VERIFIED**: `.env.production` now points the Vite frontend to the
  canonical Render backend (`https://cws-portal.onrender.com`) and its WebSocket
  endpoint. `RenderService` no longer falls back to `mockBackend` for any
  production operation; missing backend configuration fails closed.
- **TEST VERIFIED**: frontend 5 files/11 tests, lint and build PASS; backend
  33 suites/174 tests and build PASS; Worker compile and RPC-auth 4-test smoke
  PASS.
- **RUNTIME READ-ONLY VERIFIED**: Vercel root HTTP 200, Render `/health` HTTP
  200, anonymous protected `/jobs` and `/fleet/workers` HTTP 401.
- **RUNTIME VERIFIED**: Git-integrated Vercel deployment
  `dpl_4mCukKvsmUjE8miN899UNcvRjtVZ` is `READY`, targets production, aliases
  `cws-portal.vercel.app`, and carries commit `ebc7e017d7c3250b3a0680d8e8e15bb5fe56d818`.
  Served bundle `index-bm49gBRE.js` contains the canonical backend URL and no
  fake job/progress functions; its only mock reference is an explicit dev-only
  lazy import. Physical Worker, Supabase claim, B2, authenticated customer
  session, payment and final download remain unverified.
- Evidence: `reports/evidence/CWS_PRODUCTION_REAL_PATH_AUDIT_2026-08-07.md`.

## GitHub → Vercel deployment verification — 2026-08-07

- Canonical `main` is `93203a0` (latest pushed commit) and matches
  `origin/main`.
- Vercel project `cws-portal` is correctly linked to
  `trankhanhduy1508-maker/cws-portal`, branch `main`, and its current
  production deployment is `READY` on the older commit `fd34ebd`.
- The GitHub/Vercel integration has not produced a deployment for `93203a0`
  after the push; its check reports Vercel `build-rate-limit`. Production is
  therefore **NEEDS_VERIFICATION** for the
  latest commit. No Vercel CLI
  device authorization or project/config mutation was used.
- A direct prebuilt Vercel connector deployment from the current HEAD artifact
  was also attempted without device authorization; Vercel rejected it with
  `api-deployments-free-per-day`, remaining `0`, reset in approximately 24h.
- Evidence: `reports/evidence/CWS_GITHUB_VERCEL_DEPLOYMENT_2026-08-07.md`.

## Production ZIP E2E execution gate — 2026-08-07

- Read-only probes: Vercel 200, Render `/health` 200, exact CORS preflight
  204, and protected production routes 401.
- Vercel CLI auth timed out and no `VERCEL_TOKEN`, Supabase/psql, B2 or Worker
  credential is present; no production mutation was attempted.
- Production ZIP E2E remains **NEEDS_VERIFICATION/BLOCKED** at authenticated
  upload → physical Worker → B2 → payment. Evidence:
  `reports/evidence/CWS_PRODUCTION_ZIP_E2E_EXECUTION_2026-08-07.md`.

## Scaling P0 + production ZIP E2E readiness — 2026-08-07

- Existing P0 protections remain **CODE/UNIT VERIFIED**: durable job
  idempotency/fingerprint, payment uniqueness migration, disk-backed upload,
  bounded rate limits, scheduler single-flight/batched reads and DB fencing.
- Load harness now models independent customer proxy IPs without weakening
  production rate limits. Real Nest loopback load passed 10/25/50/100 jobs;
  duplicate claims were 0 and the 25/50/100 cases exercised bounded failover
  with stale completion rejection.
- Production read-only: Vercel HTTP 200 with ZIP marker; Render health 200,
  CORS preflight 204 exact origin, protected routes 401. No production
  mutation was made.
- Production ZIP E2E remains **NEEDS_VERIFICATION/BLOCKED** at authenticated
  upload/physical Worker/B2/payment because credentials, hardware and real
  payment are not available in this session.
- Evidence: `reports/scaling/CWS_P0_SCALING_AND_ZIP_E2E_READINESS_2026-08-07.md`.

## ZIP input support — 2026-08-07

- `.blend` and `.zip` are now accepted end-to-end at frontend/upload/API/B2
  metadata level. Generic Worker safely extracts ZIP inputs, preserves asset
  paths, requires exactly one `.blend`, and cleans the temporary workspace.
- Security tests cover traversal, symlink, duplicate/ambiguous blend and
  cleanup behavior. Backend 174/174, frontend 11/11, Worker 53/53 pass with
  builds/lint/compile.
- Production upload and physical Blender-from-ZIP runtime remain
  **NEEDS_VERIFICATION**.
- Evidence: `reports/worker/CWS_ZIP_INPUT_SUPPORT_2026-08-07.md`.

## Physical Worker one-job E2E readiness — 2026-08-07

- Production read-only smoke: web HTTP 200, Render `/health` HTTP 200, and
  anonymous jobs/fleet/CRM routes HTTP 401. No production mutation was made.
- Backend 172/172 + build/lint, frontend 9/9 + lint/build, Worker 49/49 +
  Python compile pass.
- Code path is prepared through `REVIEW_READY → approve → runtime price →
  payment → PAID → packaging → FINISHED → signed download`; physical Worker,
  B2 runtime, authenticated customer and live payment remain
  **NEEDS_VERIFICATION**.
- Evidence/checklist: `CWS_PHYSICAL_WORKER_ONE_JOB_READINESS.md`.

## Eevee stress benchmark — 2026-08-06

- Added bounded intentionally-unoptimized architecture scene generator and
  local Eevee/Eevee Next render runner under `tests/blender/`.
- Static contract: **2/2 PASS**; Worker suite: **48/48 PASS**.
- Local Blender 5.2.0 Eevee render is **REAL RUNTIME VERIFIED**: heavy-single
  1 frame/8.5s and heavy-animation 48 frames/153.281s. Worker, staging, B2
  and production flow were not contacted.
- Evidence: `reports/worker/CWS_BLENDER_UNOPTIMIZED_EEVEE_STRESS_TEST_2026-08-06.md`.

## Eevee stress through local WorkerEngine — 2026-08-06

- Existing 48-frame scene ran through local WorkerEngine: A verified frames
  1–24, simulated interruption, B skipped those checkpoints and verified
  frames 1–48 with one completion.
- **REAL RUNTIME VERIFIED locally**; backend Scheduler/RPC heartbeat fencing,
  B2, Admin and Customer runtime remain **BLOCKED/UNVERIFIED**.
- Evidence: `reports/worker/CWS_WORKER_EEVEE_STRESS_FLOW_2026-08-06.md`.

## Authenticated staging Eevee preparation — 2026-08-06

- Exact committed Eevee 48-frame scene manifest, staging preflight and
  migration/runtime matrix are prepared.
- Scene SHA-256 and Blender 5.2.0 preflight PASS; authenticated staging is
  **BLOCKED** because all required `CWS_STAGING_*` values are absent.
- Evidence: `reports/worker/CWS_STAGING_EEVEE_AUTHENTICATED_RUNTIME_PREP_2026-08-06.md`.

## Staging preflight blocked — 2026-08-06

- No Supabase CLI, `psql`, `.mcp.json`, staging endpoint or staging
  environment variable is available in the current machine/session.
- Therefore migrations 020/021 were not applied anywhere. Offline simulation
  and full tests/builds pass; staging runtime is not claimed.
- Evidence: `reports/worker/CWS_STAGING_IDENTITY_FAILOVER_PREFLIGHT_BLOCKER_2026-08-06.md`.

## Failover automation preparation — 2026-08-06

- Preflight, lock/timeout guard, `NOT VALID` compatibility check, rollback
  runbook, DPAPI+ACL provisioning wrapper and offline failover simulation are
  prepared.
- Production Worker self-registration was removed; constant-time credential
  hash verification is in place.
- CODE/UNIT VERIFIED; migration application, credentials, physical two-Worker
  smoke and production runtime remain unverified.
- Evidence: `reports/worker/CWS_FAILOVER_AUTOMATION_PREPARATION_2026-08-06.md`.

## Worker identity and automatic failover preparation — 2026-08-06

- Added additive migration `worker_migrations/021_production_failover_reassign_contract.sql`:
  healthy/capability-aware claim, attempt creation, generation fencing,
  stale-heartbeat failover, failed-Worker avoidance and bounded retry
  (`jobs.max_retry_attempts`, default 3, maximum 10).
- Added offline DPAPI provisioning and staging identity smoke tooling. Backend
  and provisioning tests pass; migration application, real credentials,
  Windows ACL/DPAPI, physical Worker and production RPC runtime remain
  unverified. Production remains NO-GO.
- Evidence: `reports/worker/CWS_WORKER_PROVISIONING_FAILOVER_2026-08-06.md`.

## Production NO-GO remediation continuation — 2026-08-05

- CORS: **REAL RUNTIME VERIFIED** after Founder set `CORS_ORIGINS=https://cws-portal.vercel.app`; `/health` 200 and production preflight 204 with exact allow-origin, no credential grant. Evidence: `reports/security/CWS_RENDER_CORS_CRASH_2026-08-06.md`.
- CORS request-origin callback: **CODE/UNIT + PRODUCTION VERIFIED** for canonical allow; negative-origin matrix remains code/unit verified.
- 2026-08-06 Admin job authorization hardening: removed the remaining
  `JobsController` shared-key ownership path. Cross-customer Admin job access
  now requires server-verified Supabase Bearer + `staff_roles` + `aal2`;
  legacy `x-admin-key`/`?adminKey=` regression is denied. No production
  credential or database mutation was performed.
- Secret rotation readiness: **CODE/UNIT VERIFIED**; legacy helper fallback removed and rotation order documented without values. Actual production rotation remains **BLOCKED** on Owner action.
- Production RPC: migration 019 is idempotent and **CODE/UNIT VERIFIED** on staging; production remains unchanged. Worker publishable RPC identity/authentication remains **BLOCKED** for production.
- 2026-08-06 Worker identity contract: recommended per-worker bearer token +
  HMAC proof, timestamp/nonce replay defense, DPAPI storage and backend
  allowlisted RPC gateway are **CODE/UNIT VERIFIED**. Migration 020 and real
  credential/Windows/runtime verification remain Founder gates. Evidence:
  `reports/security/CWS_WORKER_PRODUCTION_IDENTITY_RPC_CONTRACT_2026-08-06.md`.
- Admin AAL2: staging schema/RLS/RPC metadata **CODE/UNIT VERIFIED**; real Admin identity/TOTP and state matrix remain **BLOCKED** pending Owner enrollment.
- Admin authentication update 2026-08-06: Google OAuth + Supabase TOTP flow is **CODE/UNIT VERIFIED**; backend pre-MFA staff check is non-sensitive and all Admin data routes still require role + `aal2`. Current Render `/staff/mfa-status` returns HTTP 401 without credentials, confirming the route is live; real Google/TOTP/AAL2 session remains unverified.
- Windows SCM: Node Agent service PoC **REAL RUNTIME VERIFIED** for install/start/heartbeat/stop/restart/remove; GPU Worker remains a user-session helper boundary.
- Job Object: timeout/child cleanup **REAL RUNTIME VERIFIED**; Generic Worker renderer ownership is **CODE/UNIT VERIFIED** behind staging opt-in, while live Windows integration and full sandbox boundary remain **UNVERIFIED**.
- Path boundary: symlink rejection **CODE/UNIT VERIFIED**; junction/reparse disposable-host matrix remains **UNVERIFIED**.
- Blender optimizer: working-copy-only plan/apply harness **REAL RUNTIME VERIFIED** on harmless EEVEE plan; no speedup claimed. ArchViz profiles are **CODE/UNIT VERIFIED** only.
- Dependency audit: current backend `npm audit --omit=dev` reports 17 production vulnerabilities (5 High, 12 Moderate, 0 Critical); safe override experiment was rejected and removed. Nest 11 requires a separate canary.
- Decision: **PRODUCTION NO-GO**. Evidence: `reports/CWS_PRODUCTION_NO_GO_REMEDIATION_2026-08-05.md`.
- Founder product scope 2026-08-06: `/#admin` has separate Fleet + Customer CRM areas; `/` owns customer render → preview → payment → download. Evidence: `reports/product/CWS_FOUNDER_PRODUCT_FLOW_RECONCILIATION_2026-08-06.md` and `reports/product/CWS_CUSTOMER_CRM_MVP_2026-08-06.md`.

- 2026-08-06 production audit: Vercel root/Admin return HTTP 200; served bundle points to Render backend, contains fleet/CRM and `Bắt đầu render` markers, and no old pre-render payment CTA. Render `/health` is 200, CORS is exact-origin 204, `/staff/mfa-status` is 401 without credentials. Full physical Worker → Preview → Payment → Download runtime remains unverified.
- 2026-08-06 CRM deployment audit: Vercel deployment `dpl_6q4819cGaS3Hfv1y4xqtcQ62iREQ` is READY for `5e20211`; Render auto-deployed the backend and `/customers/crm` now returns HTTP 401 without credentials while `/health` is 200. Route protection is runtime verified; authenticated CRM data remains unverified pending Admin AAL2.
- 2026-08-06 fresh loop audit: production `/health` 200; anonymous `/jobs`, `/fleet/workers`, `/customers/crm`, and `/payments/reconciliation-anomalies` all return 401. Vercel bundle points to Render, contains CRM/Fleet markers, and has no pre-render payment CTA. Fleet counters and CRM aggregation are now separately unit-tested; backend 141/141 and frontend 9/9 pass.
- 2026-08-06 Scheduler state-order audit: queued/active/all-done/AWAITING_PAYMENT boundaries are covered by 4 new regression tests; backend 24 suites / 141 tests PASS. Evidence: `reports/product/CWS_SCHEDULER_STATE_ORDER_2026-08-06.md`.
- 2026-08-06 Worker/Node Agent/Security audit: staging downloader SSRF/redirect hardening is CODE/UNIT VERIFIED; Worker offline suite 38/38 PASS. Production Worker identity/RPC authentication, hostile Blend isolation, and physical Windows/GPU evidence remain NO-GO/BLOCKED. Evidence: `reports/security/CWS_FULL_WORKER_NODE_AGENT_SECURITY_AUDIT_2026-08-06.md`.

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

## Capacity/concurrency audit — 2026-08-06

- Safe local pull-claim/heartbeat/failure simulation completed for 100 jobs/1,000 Workers and 1,000 jobs/10,000 Workers; algorithmic evidence only, not production capacity.
- Scheduler hardening applied: one fleet online snapshot per tick and no overlapping cron ticks; regression tests pass.
- Payment concurrency guard prepared: `backend/migrations/017_payment_one_intent_per_job.sql` adds a non-destructive preflight plus unique partial index; not applied to production. Sequence 016 is reserved by Google OAuth.
- First scale risks: upload memory buffering, per-order scheduler task reads, single in-process poller, and unmeasured Supabase/B2/realtime limits.
- Full report: `reports/scaling/CWS_CAPACITY_AND_CONCURRENCY_AUDIT_2026-08-06.md`. Scenario A/B remain **PARTIAL / UNMEASURED**; no capacity PASS claimed.

## Scale bottleneck remediation — 2026-08-06

- Upload path now uses disk-backed streaming with B2 read-stream, request limits, timeout, and abort/error cleanup; focused upload tests pass.
- Scheduler now batch-reads task state in groups of 200 Job IDs in addition to the one presence snapshot and tick mutex.
- Synthetic heartbeat jitter/reconnect/failure storm harness expanded for both scale scenarios; infrastructure capacity remains unverified.
- Payment guard renamed to `backend/migrations/017_payment_one_intent_per_job.sql` because sequence 016 is already Google OAuth; no migration applied to production.

## Functional/E2E and security-tool audit — 2026-08-06

- TestSprite CLI was executed and `doctor --output json` confirmed the real blocker: no `TESTSPRITE_API_KEY`; no cloud TestSprite result is claimed.
- Strix could not run on this machine because Docker/Bash/Python/Pip and an approved LLM credential are absent; no Strix severity counts are claimed.
- Fixed backend E2E harness defects: CommonJS-compatible `supertest` import, canonical `/health` assertion, app cleanup, and test-only non-secret environment setup.
- Fixed a real backend packaging compatibility issue: dynamically load the named ESM `ZipArchive` export from CommonJS output. Runtime ZIP smoke passed.
- Verification: frontend 9/9 + frontend lint/build PASS; backend 161/161 + E2E 1/1 + build PASS; Worker 48/48 PASS; root audit 0 vulnerabilities. Backend lint remains blocked by pre-existing repo-wide CRLF/Prettier violations; no bulk format was applied. Backend production audit remains 17 vulnerabilities (12 moderate, 5 high), with breaking upgrade path documented and no force upgrade applied.
- Evidence: `reports/security/CWS_TESTSPRITE_STRIX_FUNCTIONAL_SECURITY_AUDIT_2026-08-06.md`.

## Dependency and upload hardening follow-up — 2026-08-06

- Re-ran backend production audit: 17 findings remain (5 High, 12 Moderate, 0 Critical). Dry-run/dedupe produced no safe non-breaking remediation; the Nest 11 canary remains required.
- Hardened B2 upload object naming: only a bounded safe basename is included in the generated key; path separators/control characters cannot shape the object path. Regression test and backend build pass.
- Evidence: `reports/security/CWS_DEPENDENCY_AUDIT_2026-08-06.md`.

## Generic Worker fencing/memory hardening - 2026-08-06

- Checkpoint writes now use bounded 1 MiB disk streaming with atomic replacement and temporary-file cleanup; frame size no longer forces a full `read_bytes()` allocation.
- Generic Worker checks the attempt lease immediately before checkpoint/output side effects, reducing stale-attempt writes after failover fencing.
- Worker suite: **49/49 PASS**. This is code/local evidence only; authenticated physical Worker and production E2E remain unverified.
- Evidence: `reports/worker/CWS_GENERIC_WORKER_FENCING_MEMORY_HARDENING_2026-08-06.md`.

## Read-only production wiring probe - 2026-08-06

- `https://cws-portal.vercel.app/`: HTTP **200**; served bundle contains the canonical backend `https://cws-portal.onrender.com`.
- `https://cws-portal.onrender.com/health`: HTTP **200**.
- CORS preflight from `https://cws-portal.vercel.app`: HTTP **204**, `Access-Control-Allow-Origin` matches exactly.
- This verifies deployment wiring/health only. Customer → physical Worker → Blender → B2 → real payment → download remains **NOT E2E PASS**.
- Evidence: `reports/evidence/CWS_READ_ONLY_PRODUCTION_WIRING_PROBE_2026-08-06.md`.

## 100-customer backend load simulation - 2026-08-06

- Real Nest HTTP/application simulation: 10/25/50/100 submissions, ramp-up,
  status refresh, worker shortage, timeout/disconnect/reconnect failover and
  stale fencing: **PASS** at simulated level.
- 100 case: 100/100 jobs reached `REVIEW_READY`, duplicate Worker claims 0,
  p95 submit 59.14 ms, p99 59.27 ms, scheduler tick 1.44 ms locally.
- Duplicate identical `POST /jobs` is now protected by the committed
  Idempotency-Key contract; staging/production migration application remains
  unverified.
- This does not verify Supabase/RLS/B2/Blender/payment/physical Worker or
  production capacity. Evidence: `reports/scaling/CWS_100_CUSTOMER_BACKEND_LOAD_SIMULATION_2026-08-06.md`.

## SQL/Redis MVP boundary - 2026-08-06

- No Redis client or deployment exists in the repository. PostgreSQL/Supabase
  remains source of truth for durable state and atomic Worker leases; Redis is
  deferred until isolated staging proves a real heartbeat/presence bottleneck.

## Production deployment/E2E readiness - 2026-08-06

- Canonical `main` is `b630987`; Vercel production is older `95abec7`. A safe
  deploy attempt was rejected by Vercel daily API quota (`payment_required`,
  remaining 0); no production mutation occurred.
- Read-only production wiring passes: Vercel 200, UI flow markers correct,
  Render `/health` 200, CORS preflight 204, anonymous protected routes 401.
- One-job physical E2E remains `NEEDS_VERIFICATION` pending quota reset,
  authenticated customer, physical Worker/Blender, B2 and payment.
- Evidence: `reports/evidence/CWS_PRODUCTION_DEPLOYMENT_AND_E2E_READINESS_2026-08-06.md`.

## Vercel production deployment verified - 2026-08-07

- Deployment `dpl_J2pfgu2tRXME7dCj9r3ECn5pUHVs` is READY on production and
  matches canonical `main` SHA `2f1215a3c55e233c2cbc7d3533f0cf0d32d8f8b4`.
- `https://cws-portal.vercel.app/` returned HTTP 200 and served the latest
  hashed UI bundle. This verifies deployment and basic web smoke only; it does
  not verify authenticated Admin, physical Worker, B2 or payment E2E.

## Job create idempotency - 2026-08-06

- `POST /jobs` now requires a bounded `Idempotency-Key`; same-key retries
  return one durable `jobId`, payload/key reuse is rejected, and concurrent
  insert races are fenced by a unique index.
- Code/tests verified: backend 165/165 + E2E 2/2, frontend 9/9, lint/build
  PASS. Migration 018 is not applied to staging/production.
- Staging capacity remains `NOT VERIFIED`: no staging endpoint, CLI or
  credential is available in this session. Evidence:
  `reports/scaling/CWS_JOB_CREATE_IDEMPOTENCY_2026-08-06.md`.

## API security hardening - 2026-08-06

- Payment detail access is now ownership/Admin-AAL2 checked; direct payment
  create/confirm routes are Admin-AAL2-only.
- Added bounded upload/job/Drive/payment rate limits, stricter DTO bounds,
  whitelist rejection, Google API timeout/redirect rejection and API security
  headers. Backend 172/172, frontend 9/9 and Worker 49/49 pass with builds.
- Dependency audit remains 5 High + 12 Moderate and requires a separate
  breaking-upgrade canary. Production authenticated runtime remains
  `NEEDS_VERIFICATION`.
- Evidence: `reports/security/CWS_API_SECURITY_HARDENING_AUDIT_2026-08-06.md`.

## Premium dark UI refresh - 2026-08-07

- Customer presentation layer now uses a restrained dark responsive theme with
  a lightweight CSS 3D CWS mark and reduced-motion fallback.
- No customer state/API/payment logic changed; amount/payment remain gated
  behind render completion and the existing review workflow.
- Frontend tests 9/9, lint and production build PASS. Local browser visual
  verification was not available because `agent-browser` is not installed.
- Evidence: `reports/product/CWS_UI_PREMIUM_DARK_REFRESH_2026-08-07.md`.

## Vercel production HEAD verification - 2026-08-07

- Canonical local/remote `main` is `4f4600804e19f4a1937d36cb7ad83c19c57f1311`.
- Connected Vercel lookup confirms the correct `cws-portal` project and
  production branch `main`; production is READY but still serves commit
  `95abec7b5b49e7788066ef328647845c12968851`.
- Production root read-only smoke returned HTTP 200. Deployment to the exact
  commit is **BLOCKED/NEEDS_VERIFICATION** because no Git-SHA deployment
  credential/API is available and the worktree contains unrelated dirty
  backend files that must not be deployed.
- Evidence: `reports/evidence/CWS_PRODUCTION_DEPLOYMENT_AND_E2E_READINESS_2026-08-06.md`.

## NestJS 11 isolated canary - 2026-08-07

- Ephemeral canary upgraded Nest runtime/toolchain to 11.1.28 and schedule to
  6.1.3; 172/172 tests and build PASS.
- `js-yaml` 5.2.3 override reduced canary audit to 0 findings. Production
  dependency tree was not changed because Nest 11 is a major upgrade.
- Canary lint is NOT PASS due 1,972 pre-existing Prettier violations; no bulk
  formatting was applied. Staging authenticated E2E remains BLOCKED: no
  staging env, DB CLI, B2, payment or Worker credentials are available.
- Evidence: `reports/security/CWS_API_SECURITY_HARDENING_AUDIT_2026-08-06.md`.
