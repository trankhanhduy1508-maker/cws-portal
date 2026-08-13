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
