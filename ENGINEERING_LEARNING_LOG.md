# Engineering Learning Log

## 2026-08-13 — Google Drive submission UX contract

- **Symptom:** The Drive modal described the canonical submission as a separate
  link-check/confirmation step, and structured backend errors could be coerced
  into unreadable customer text.
- **Root cause:** Frontend copy did not match the direct-submit contract, while
  response errors were selected with `body.message` without recursively
  normalizing structured values.
- **Fix:** Made the modal submit directly into the existing authenticated
  `DRIVE_RESOLVE` path, normalized structured errors, and required the
  Backend-created `jobId` before accepting Drive success.
- **Verification:** Frontend tests 46/46, build PASS, lint PASS with existing
  warnings. No backend, schema, production, or deployment changes.
- **New rule:** Customer Drive success must be a readable, backend-owned
  `jobId` result; missing identity or structured error data fails closed.
- **Remaining risk:** Production browser behavior and deployed bundle remain
  unverified until a Founder-approved deployment and Customer E2E gate.
- **Next highest-priority action:** Independent review of the focused PR before
  Founder merge approval.
## 2026-08-13 — Shared Blender signature consistency

- **Symptom:** Production Drive ingestion rejected a valid `.blend` with `Chữ ký nội dung không khớp phần mở rộng.`
- **Evidence:** The Drive response identified `PhongNguRender5.blend`; the actual bytes began with Zstandard magic `28 B5 2F FD`.
- **Root cause:** The Drive-specific validator accepted the Zstandard Blender representation, while the shared `hasValidInputSignature` helper accepted only the ASCII `BLENDER` header.
- **Fix:** Centralized the existing Zstandard magic constant and accepted it in the shared `.blend` signature validator.
- **Verification:** Focused signature tests passed; full backend tests passed 222/222; backend build passed. Repository lint remains blocked by the pre-existing CRLF/Prettier baseline.
- **Remaining risk:** Production deployment and a fresh authenticated Drive submission remain unverified until Founder review and merge/deployment.

## 2026-08-10 â€” Node Engine/Worker grounding and readiness foundation

- **What changed:** Confirmed the production-backed repository and commit;
  documented the launcher-versus-engine distinction; repaired two stray
  trailing bytes in `worker/test_worker_rpc_auth.py`; added
  `worker/node_engine/` capability discovery and fail-closed readiness modules;
  connected readiness diagnostics to the production Node Agent health probe;
  added two readiness tests.
- **Symptom:** The desktop launcher appeared to be approximately 1 KB, and
  the worker test suite could not be collected.
- **Root cause:** The small files are intentionally wrappers/manifests; the
  actual engines are large canonical modules. The test file contained two
  non-UTF-8 trailing bytes. Production readiness was distributed across
  configuration, DPAPI identity, Blender, backend RPC and runtime evidence
  without one explicit local readiness result.
- **Decision:** Preserve the existing `ACTIVE_IDLE`/RPC/lease/generation
  contracts. Add capability/readiness as a deterministic local admission and
  diagnostics layer; do not invent hardware values or alter backend state.
- **Verification:** Worker suite `98/98` PASS; `python -m compileall -q worker`
  PASS. This is `CODE VERIFIED` only.
- **Not implemented:** Windows service installation, production identity
  enrollment, live heartbeat/claim, real Blender/B2 production evidence,
  update/rollback fleet rollout, payment and Golden E2E.
- **Unresolved risks:** Production worker credentials/configuration are absent
  on this host; all observed production workers remain offline. Legacy
  `cws_worker.bat` contains embedded B2 credential material and remains
  excluded from runtime pending security remediation/rotation.
- **Next highest-priority action:** Verify the new readiness contract on a
  real Windows worker with an enrolled identity and fresh production heartbeat;
  do not mutate Supabase state manually.
## 2026-08-10 â€” production worker enrollment execution

- **Symptom:** the production Node Agent could not start a heartbeat loop.
- **Root cause:** the host has no approved enrollment ticket, durable worker identity, or DPAPI credential; the agent correctly fails closed before RPC.
- **Action:** configured only safe non-secret values: canonical Render backend URL and `%LOCALAPPDATA%\\CWS\\workspace`; ran the canonical production entrypoint.
- **Evidence:** entrypoint exited with `missing production configuration: CWS_WORKER_ID`; no heartbeat or database state was fabricated.
- **Not effective / rejected:** reusing one of the offline Supabase worker IDs, generating a random ID, recovery-only SQL provisioning, or fake heartbeat. These would violate the authenticated identity boundary.
- **New rule:** production enrollment must use the existing Admin-AAL2-issued short-lived ticket, redeem it through the backend, and store the resulting credential only in Windows DPAPI.
- **Unresolved risk:** Blender and 7-Zip are also absent locally, but dependency installation is downstream of the enrollment gate.
- **Dependency fix:** provisioned Blender 5.2.0 LTS and 7-Zip 26.02 from Chocolatey packages; Blender headless smoke test passed (`CWS_BLENDER_SMOKE_OK`, exit `0`) and workspace runtime directories were created.
- **Enrollment verification:** the live canonical endpoint `POST /worker/enrollment/tickets` returned HTTP `401 Unauthorized` without credentials and explicitly requires a real Supabase Bearer session plus MFA/AAL2. The endpoint is present; the missing item is authorization, not implementation.
- **Next highest-priority action:** obtain an authorized short-lived enrollment ticket for this host, then run the canonical redemption script and verify multiple authenticated heartbeat cycles from Supabase.
## 2026-08-10 â€” Admin/customer role separation

- **Symptom:** production Admin after Google + MFA looked almost like the Customer render UI.
- **Root cause:** `/admin` routing was correct, but `AdminScreen` was only an inline Worker Fleet + CRM view with no operations shell or capability-oriented navigation. The absence of Admin structure made the role boundary invisible.
- **Fix:** replaced the page with a dedicated operations console: Overview, Jobs, Customers, Workers/Nodes, Payments, Enrollment, Logs, System Health and Settings; reused existing protected APIs.
- **Security rule:** enrollment UI calls the existing AAL2-protected backend endpoint; no public route, service-role key, fake metrics or client-side role bypass was added.
- **Verification:** frontend tests 12/12, lint PASS, production build PASS.
- **Unresolved risk:** Payments, Settings and aggregate System Health remain partial where backend APIs do not exist; UI states this explicitly instead of inventing data.
- **Next highest-priority action:** deploy the canonical frontend change and verify `/admin` with the real AAL2 session, then add only backend capabilities that are proven necessary.

## 2026-08-11 â€” production Admin route mismatch

- **Symptom:** the live Admin bundle was new, but `https://cws-portal.vercel.app/#/admin` still displayed the old Customer UI.
- **Evidence:** live bundle markers proved the new Admin code was deployed; `App.jsx` matched only `#admin` while the URL hash was `#/admin`.
- **Root cause:** hash-route syntax mismatch caused `App()` to fall through to `CustomerPortalApp`; this was not a Vercel deployment or cache problem.
- **Fix:** accept both legacy `#admin` and production `#/admin` route forms, plus `/admin` pathname.
- **Verification:** frontend tests 12/12, lint PASS, build PASS.
- **Unresolved risk:** production UI still needs a browser smoke test after the route-fix deployment with the real AAL2 session.

## 2026-08-11 — Admin root routing must be reactive

- **Symptom:** after the previous hash-string fix and a READY production deployment, the Founder still observed the old/customer UI on the Admin route.
- **Root cause:** the previous fix corrected accepted route syntax but left root shell selection as an imperative `window.location` read inside `App.jsx`. React had no root `hashchange`/`popstate` subscription, so URL navigation could leave the already-mounted customer tree stale.
- **Why the previous fix was insufficient:** adding `#/admin` to an `if` condition only helps when `App()` renders again; it does not itself cause a render when the hash changes.
- **Fix:** added a deterministic `resolveRootRoute`, a `RootRouter` above `App`, and explicit `hashchange` + `popstate` subscriptions. Admin routes now mount `AdminScreen` before the customer app tree. No auth or backend authorization boundary was weakened.
- **Regression coverage:** added route-resolution tests for `#/admin`, `#admin`, Admin subroutes, `/admin`, and non-Admin routes. Updated frontend CI to execute `npm test` so regression tests are actually enforced.
- **Verification:** PR frontend CI build/test/lint PASS; Vercel preview deployment for the PR head is READY. This is CODE/DEPLOYMENT VERIFIED, not yet production DOM verified.
- **What was not effective:** treating deployment READY, bundle markers, or string matching alone as proof that the correct shell was mounted in a real browser.
- **Rule learned:** top-level URL-derived shell selection must be reactive; a route alias fix is not complete unless navigation itself triggers the shell-selection state update.
- **Remaining risk / next step:** merge to main, verify the existing `cws-portal.vercel.app` alias points to the merged commit, then obtain real browser DOM evidence for `/#/admin` before claiming production runtime verification.

## 2026-08-11 — Admin OAuth callback must not share the URL fragment with routing

- **Symptom:** a fresh production screenshot after the reactive root-router deployment still showed the Customer upload UI when Admin was expected.
- **Root cause:** the browser Supabase client uses the default JavaScript implicit OAuth flow, which returns access/refresh tokens in the URL fragment. Staff OAuth also used `redirectTo: /#admin`, so OAuth callback data and Admin routing competed for the same `window.location.hash`. The callback could replace `#admin` with `#access_token=...`, making the router resolve the Customer shell.
- **Why the previous fix was insufficient:** reactive hash routing only helps when the Admin hash survives. It does not solve a protocol-level collision where Supabase legitimately owns and replaces the fragment during implicit OAuth.
- **Fix:** move Admin shell identity to pathname `/admin`. Existing Vercel SPA rewrites already serve `/admin`, RootRouter already recognizes the pathname, and Supabase can consume its auth fragment without changing the selected shell.
- **Regression coverage:** `staffAuth.test.js` requires the `/admin` callback and `rootRoute.test.js` proves `/admin` remains Admin when an implicit OAuth token fragment is present.
- **Security:** no change to Google provider, Supabase session persistence, TOTP/AAL2, backend RBAC, bearer handling, or infrastructure.
- **Verification:** PR frontend build/test/lint PASS and backend CI PASS. Production deployment and fresh browser evidence are required before marking `PRODUCTION RUNTIME VERIFIED`.
- **Rule learned:** never use the same URL fragment namespace for application routing and an OAuth flow that returns credentials/state in the fragment.


## 2026-08-11 — baseline validation contract recovery

- **Problem encountered:** PR #31 CI exposed a compile/test baseline inconsistency from the prior Input Validation sync.
- **Root cause:** files.controller.ts called hasValidInputSignature, but the backend utility export was missing; the frontend link matcher still accepted OneDrive/Dropbox/direct URLs despite the active Google Drive-only contract.
- **Fix applied:** restored deterministic .blend/ZIP/RAR magic-byte validation and restricted the shared-link matcher to approved Google Drive file links, with targeted regression tests.
- **What worked:** grounding the failing CI boundary against the active workflow/spec before editing kept the fix limited to input validation.
- **What failed:** the earlier sync treated compile/test convergence as complete without a fresh canonical CI run.
- **Lesson learned:** every cross-project contract change needs a same-commit compile/test check for both caller and implementation, plus explicit tests for the active public input contract.
- **Rule for future:** do not mark a gate PASS from local or preview evidence while canonical CI still has a baseline failure.
- **Remaining risks:** fresh PR CI is still required; no scheduler, Worker, payment, Admin or deployment work is authorized by this recovery gate.


## 2026-08-11 — first real-task metadata contract

- **Problem encountered:** the first real Worker Task could preflight a Blender project, but the canonical path had no authenticated contract to persist the authoritative frame interval and FPS before Task completion.
- **Root cause:** the old set_job_total_frames RPC stored only total_frames/fps, was not called by production_node_agent.py, and did not use task generation fencing.
- **Fix applied:** added additive jobs.frame_start/frame_end fields and a fenced, idempotent report_job_metadata RPC; canonical Blender preflight now extracts metadata with autoexec disabled and reports it before WorkerEngine renders the owned Task.
- **What worked:** reusing the existing Backend Worker RPC gateway, Supabase service-role boundary, JobSpec/WorkerEngine preflight and lease/generation identity kept the change inside the approved architecture.
- **What failed:** the initial generated test insertion was malformed at the file closing boundary and was corrected before CI verification.
- **Lesson learned:** metadata discovery must be a first-class fenced event on the real Task, not an unfenced replacement for total_frames.
- **Rule for future:** do not expand or partition Tasks until metadata is durably accepted for the owning task/generation; do not treat CI success as runtime/production proof.
- **Remaining risks:** Scheduler Task Graph expansion, disjoint-range enforcement, runtime evidence wiring and adaptive scaling remain unimplemented and are the next bottleneck.

## 2026-08-14 - Track A per-job coupling audit

- **Problem:** Founder operations still appeared to require changing or regenerating `cws_worker_full.py` for each new Blender file.
- **Root cause:** The active render core already removed the old hardcoded claim dependency: `claim_next_task()` selects across the Supabase task queue and `_load_job_context(job_id)` reads each job's input dynamically. The remaining manual coupling is upstream job/task seeding and the absence of a local per-job deliverable/intake contract.
- **Failed approach:** Treating the old `JOB_ID` comments/history as the active execution boundary would have led to editing the renderer or adding a second competing supervisor.
- **Fix/design:** Keep `cws_worker.bat` as the sole process restart shell and `cws_worker_full.py` as the queue claimant; design a local SQLite intake manifest that submits through an approved authenticated backend bridge and observes authoritative completion/output state.
- **Verification:** Current-code audit of `claim_next_task()`, `_load_job_context()`, `worker_loop()`, B2 key construction, `JobsService`, and `WorkerFleetGateway`; recorded in `reports/worker/CWS_TRACK_A_SUPERVISOR_V1_AUDIT_2026-08-14.md`.
- **Future rule:** Before changing Worker code for per-job friction, trace the full intake -> internal jobs/tasks -> claim -> output path. Do not reintroduce job identity into stable renderer code or write directly to Supabase from a local queue.
- **Remaining risks:** No local Founder intake bridge exists yet; deliverable types are not part of the legacy render core; tracked launcher credential material requires Founder-controlled rotation/removal before claiming the P0 safety floor is satisfied.

## 2026-08-14 - Windows development setup preflight

- **Problem:** The new one-click setup could not reach the install phase on this host.
- **Root cause:** The Windows host has no `winget` command/App Installer package available in PATH; Python is also absent, while Git, VS Code, GitHub CLI and Node/npm are already present.
- **Failed approach:** Assuming `winget` was universally available on Windows 10/11 would have produced an unclear install failure.
- **Fix:** The setup script performs DNS/HTTPS and elevation checks, detects each tool independently, stops clearly when the package manager prerequisite is missing, and writes a machine-local report without secrets.
- **Verification:** Elevated preflight: Windows/Admin/DNS/HTTPS PASS; `winget` MISSING; no package was installed and no repository state was changed by the setup run.
- **Future rule:** Treat package-manager availability as an explicit preflight boundary; never silently fall back to arbitrary download/install sources or ask the Founder to edit script placeholders.

## 2026-08-14 - Track A Supervisor V1 local manifest slice

- **Problem:** Founder needs to prepare multiple per-customer Blender jobs without editing the stable Worker source for each file.
- **Root cause:** The remaining friction is local intake/task preparation, while Track A already claims queued jobs dynamically; a second render supervisor would duplicate process/claim ownership.
- **Failed approach:** No backend submission or direct Supabase write was added; doing so before the authenticated intake boundary is defined would create an unsafe local control plane.
- **Fix:** Added a standard-library SQLite manifest and prompt-driven Windows launcher with generated IDs, multi-job entry, validation, list/show/edit, and deletion restricted to local-only states.
- **Verification:** Static contract scan, no-integration scan, diff check and secret-value scan PASS. Python runtime tests are NOT VERIFIED because this host has neither `python`, `python3`, nor `py` available; the launcher reports that prerequisite clearly.
- **Future rule:** Keep local manifest state separate from authoritative backend/Worker state. `READY_TO_SUBMIT` is never `INPUT_SAFE`, submitted, rendered, uploaded, paid or delivered.
- **Remaining risks:** Authenticated backend intake adapter, authoritative status observation, deliverable finalization and real Track A runtime remain future slices; no production writes were attempted.

## 2026-08-14 - Track A Archviz preflight V1

- **Problem:** Track A needed a scene-cost/dependency preflight for architectural visualization, but a scene analyzer already existed and was already part of the Worker path.
- **Root cause:** The existing analyzer had the correct read-only/headless boundary but exposed only a narrow legacy report; creating a second analyzer would duplicate the Worker integration and risk contract drift.
- **Failed approach:** An intermediate file replacement applied the delete phase before the add phase, temporarily showing the existing analyzer as deleted in the worktree. It was immediately restored before sync; no commit or production runtime used the transient state.
- **Fix:** Extended `worker/blender_scene_analyzer.py` in place with the `cws.archviz-preflight.v1` envelope, preserving Worker-compatible fields. Added deterministic risk flags, profile hints, Cycles/light-path observations, dependency/cache/texture/geometry indicators, and static safety checks. The analyzer remains no-render, no-save, no-autoexec and service-free.
- **Verification:** `git diff --check`, source-level service/mutation scan, and Worker-core diff checks PASS. Python and Blender executables are absent on this host, so test execution and Blender runtime evidence remain NOT VERIFIED.
- **Future rule:** Before adding a preflight/analyzer, search all Worker/render paths and extend the existing authoritative analyzer when its boundary already matches. Apply file mutations atomically and verify status immediately after an interrupted patch.

## 2026-08-14 - Track A self-bootstrap convergence

- **Problem:** The normal Worker entrypoint attempted to recover Python, but a reset/diskless machine could receive an unverified archive, an unverified `get-pip.py`, or unbounded package installation; Blender recovery also lacked archive safety checks.
- **Root cause:** Bootstrap behavior had grown incrementally inside the launcher and Worker without one bounded integrity/provenance contract. The development setup script was winget-based, while the render host must work without winget.
- **Failed approach:** Reusing the general winget setup as a render-time dependency path would add a package-manager prerequisite and would not satisfy the portable/diskless runtime contract. A broad pip upgrade would also create unrelated compatibility drift.
- **Fix:** Kept the existing Worker entrypoint and portable cache, added official Python/get-pip SHA-256 pins, executable/exit-code checks, constrained binary-only package recovery, and bounded Blender ZIP validation with staging extraction and traversal/member/size checks.
- **Verification:** Static bootstrap contract checks and `git diff --check` pass. Python and Blender are absent on this host, so runtime bootstrap and full-render verification remain explicitly unverified; the production launcher was not executed.
- **Future rule:** Repeated runtime preparation belongs behind the normal Worker entrypoint, but every remote artifact must have an approved source, bounded download, integrity/provenance check where available, deterministic cache, and explicit verification before execution. Do not claim runtime readiness from source inspection alone.
- **Follow-up:** Added `cws_worker.bat --bootstrap-only` so runtime dependency verification can run without update checks, Supabase/B2 access, task claims, or Blender rendering. Use this gate before any real customer render.
- **Runtime defect found:** The first bootstrap-only execution installed Python 3.12.7 and the required packages, then failed because Python embeddable's isolated path did not include the script directory and could not import the companion `worker` Guard module.
- **Fix and verification:** Inserted the Worker script directory into `sys.path` before the companion import; bootstrap-only will be rerun against the same local cache. Future rule: every embeddable-Python runtime must verify both package imports and repository companion-module imports, not only `python.exe --version`.
- **Drive runtime finding:** The provided `.blend` metadata is available, but the connector rejects the 929 MB raw download at its 100 MiB limit and the legacy HTTP path receives an authenticated Google sign-in page rather than a virus-warning payload.
- **Boundary:** The failed approach was to infer a new `uuid` from the sign-in HTML or bypass the authenticated file boundary. The fix is an explicit fail-closed error; future rule: do not claim download/render readiness until the approved authenticated transfer produces and validates a local immutable working copy.

## 2026-08-14 - Track A rented-machine guard V1

- **Problem:** A gaming-host customer can start a game, sleep, or accidentally shut down the PC while a claimed render task is active; wallpaper alone is only a notice.
- **Root cause:** Track A had no local lease-owned host control. The Worker claim/task state was remote, while Windows power/process controls were not tied to the actual render lifecycle.
- **Failed approach:** Reusing Track B Node Agent/Worker Engine or making the Guard active whenever the Worker/Blender process existed would cross the Track A boundary and would lock idle machines without a real task lease.
- **Fix:** Added a local lease-scoped Windows Guard with explicit acquire/state/release transitions, stale-PID recovery, a generic fullscreen notice, supported keep-awake/shutdown-block APIs, and a small exact-name process policy. It is integrated around the existing claimed-task render path only.
- **Verification:** Static contract checks and diff checks are the available evidence. Python/Blender runtime and real Windows process/power/UI behavior are NOT VERIFIED on this host. The existing B2 update path also still packages only `cws_worker_full.py`; companion Guard files need a packaging/runtime check before deployment.
- **Future rule:** Host controls must be tied to a concrete local lease, have a bounded policy and protected process exclusions, release on every terminal path, and recover stale ownership. Never claim host enforcement from static code alone; verify the exact packaged artifacts on the partner machine.

## 2026-08-14 - Track A engine-aware optimization convergence

- **Problem:** The legacy `cws_worker_full.py` path contained overlapping inline analysis and active quality-sensitive mutations, including Samples/Shadow/Simplify/Caustics/Clamp and automatic lighting behavior.
- **Root cause:** Historical Founder decisions were embedded as executable strings after the canonical research had classified most of those changes as benchmark-only or do-not-auto-change. The path also did not have one explicit engine gate before policy routing.
- **Failed approach:** Treating `safe_optimizations` and `level2_safe_optimizations` field names as current permission would have applied visual changes across engines and would have called Persistent Data useful despite a fresh Blender process per frame.
- **Fix:** Routed the active path through the existing Archviz analyzer, normalized actual `scene.render.engine` to CYCLES/EEVEE_LEGACY/EEVEE_NEXT/UNKNOWN, added deterministic characteristics, and replaced the active policy call with diagnostics-only code. Unknown/failed detection preserves settings.
- **Verification:** Static source contract and diff checks are added. Python/Blender runtime verification remains unavailable on this host; no render, backend, Supabase or B2 operation was run.
- **Future rule:** `NO ENGINE DETECTION = NO AUTO OPTIMIZATION`; engine-specific quality changes require a separate benchmark on a derived working copy and must never be smuggled through a “safe” plan field.
