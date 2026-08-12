# CWS Roadmap — Canonical

> **Single roadmap source of truth.** Updated 2026-08-12.
> Historical roadmap versions are not active instructions. Runtime evidence under `reports/` remains historical proof.

## 1. Product Goal
Build a production CWS MVP where a customer authenticates with Google, submits a real Blender project, CWS quarantines and verifies that input, automatically creates one customer-owned Job after `INPUT_SAFE`, then automatically allocates enough eligible Workers to drive the complete render deliverable toward a 45-minute internal target, produces real watermarked previews plus final price/payment QR, verifies Vietnam bank payment by SePay, and unlocks the locked full output.

## 2. Canonical Customer Workflow

`Google Login -> authenticated Upload/Google Drive -> materialize into canonical B2 quarantine -> ownership/provider/SSRF/size/signature checks -> anti-malware scan -> archive/Blender structural safety -> INPUT_SAFE -> auto-create exactly one customer-owned Job -> analyze frame/work range -> build durable non-overlapping Tasks -> start initial desired Worker wave -> measure real completed task/frame runtimes while useful work is running -> adapt Worker count upward as needed for <=45-minute final-output target -> safe preparation/optimization -> real Blender render -> collect/validate -> animation assembly/encode if required -> upload FULL OUTPUT to B2 LOCKED -> generate 3–5 CWS-watermarked previews -> calculate FINAL PRICE -> create payment record/code/MB QR -> customer pays -> SePay verifies exact reference/content + amount idempotently -> PAID -> authorized B2 download -> History/cleanup/audit`

### Binding business rules
- Customer Google Login is the **first operational gate**.
- Upload/Drive controls are authenticated-only.
- A supported authenticated New Render submission expresses render intent.
- The former mandatory post-validation **Start render** gate is superseded.
- Normal Customer runtime requires zero Founder/Admin approval.
- Input is hostile until canonical materialization + security/structural validation succeeds.
- **No production Job before authoritative `INPUT_SAFE`.**
- Supported canonical customer inputs: `.blend`, `.zip`, `.rar`, and approved Google Drive file links.
- Google Drive input is materialized to B2 before Worker processing and must pass the same security gate as direct upload.
- Anti-malware is a required additional layer; scanner error/timeout/unavailable/unknown fails closed and creates no Job.
- Malware CLEAN does not replace signature validation, archive safety or Blender safety.
- Do not send private customer project files to public malware scanning services without Founder approval.
- Automatic Job creation after `INPUT_SAFE` is server-side, customer-owned and idempotent; retries must not create duplicate Jobs.
- Customer render speed/tier selection remains removed. Customer does not choose Worker count, GPU or CPU.
- Active UI/API/domain/persistence must not depend on a customer tier identifier.
- CWS automatically plans parallel capacity.
- Initial runnable render wave targets **10 eligible Workers** when capacity permits.
- First completed real Tasks/frames are runtime evidence; there is no blocking benchmark-only phase.
- If projected final completion exceeds the 45-minute target, CWS scales the same Job upward as eligible capacity is available.
- Capacity planning uses a configurable safety margin initially in the 20–30% range and rounds required Worker count **up** to a whole integer.
- One Task/frame has one active authoritative Worker owner at a time. Reassignment occurs only through lease/generation fencing.
- The 45-minute target includes required finalization such as render, collection/validation and animation assembly/encode when applicable. It is an internal mandatory scheduling target, not a public contractual SLA unless separately approved.
- Customer originals are immutable.
- Untrusted Blender Python autoexec remains disabled.
- No fake/demo progress, render, payment, output or security verdict in production.
- No AI/Founder/Admin intervention is allowed for normal runtime state transitions.
- No payment before real render/output/previews.
- **No customer-approval gate before payment.**
- Full output is uploaded once, locked before payment, and unlocked after PAID; do not rerender/repackage/reupload merely to deliver it.
- Final customer pricing keeps the approved **2.5x multiplier** over verified cost basis.

## 3. Canonical Architecture
- Customer frontend: existing Vercel project `cws-portal.vercel.app`.
- Admin frontend: separate React/Vite build in the same repo at `cws-admin.vercel.app`; Admin remains a core CWS component.
- Backend/API: one existing Render.com service shared by Customer and Admin.
- Database/Auth: one existing Supabase project; Customer Google OAuth and staff Google OAuth + TOTP/AAL2/role checks remain separate auth flows.
- Storage: existing Backblaze B2; use logical quarantine/untrusted state/prefix inside existing storage rather than creating a new bucket without approval.
- Input security: authenticated ownership, provider/SSRF controls, bounded download/resource rules, content/signature validation, anti-malware, archive/Blender structural safety.
- Render runtime: canonical Windows Node Agent + generic Worker Engine + Blender CLI/background.
- Partner host image model: approved net-cafe/office fleets bake shared CWS runtime components into Windows/BootROM Golden Image; per-machine Worker identity/credential remains distinct persistent machine state and is never cloned as one shared credential.
- Host process lifecycle: Node Agent is the one resident Windows auto-start supervisor; Worker Engine is launched only for assigned tasks and exits after completion/failure cleanup.
- Normal reboot: load existing per-machine identity/credential -> Node Agent auto-start -> heartbeat -> `ACTIVE_IDLE`; normal reboot does not re-enroll when persistent machine state is available.
- Payment detection: SePay webhook; exact reference/content + amount; idempotent/fail-closed.
- Worker control plane: authenticated Backend gateway; no Supabase service-role key on Workers.
- Scheduling: PostgreSQL durable task ownership using atomic claim/lease/generation fencing plus Adaptive Deadline Scheduler. No new broker/Redis until measurement proves a bottleneck.
- Worker storage access: short-lived task/object-scoped capabilities; no long-lived per-Worker B2 keys.
- MVP parallelism is across independent frames/tasks. Distributed tile/sample rendering of one single frame is not current scope.

## 4. Execution / Governance
Every CWS change follows:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> Specify -> Clarify when needed -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify -> Learn`

Rules:
- documents before code;
- root cause over symptom;
- production evidence over simulation;
- one current E2E bottleneck at a time;
- existing infrastructure only unless Founder explicitly approves a new resource;
- the already-approved `cws-admin` Vercel frontend does not authorize any other duplicate infrastructure;
- update the engineering learning log after material technical/documentation changes.

## 5. Current MVP Milestones

### M0 — Source-of-truth convergence
**IN_PROGRESS (2026-08-12)**
- One canonical roadmap (`CWS_ROADMAP.md`).
- `CURRENT_STATUS.md` is current-only.
- Customer workflow is login-first, security-gated and automatically creates one Job after `INPUT_SAFE`.
- The previous mandatory Start Render gate is superseded.
- Admin remains an active/core roadmap component.

### M1 — Customer identity + canonical safe input
**CODE/SCHEMA PARTIALLY VERIFIED; SECURITY/AUTO-JOB FLOW NEEDS IMPLEMENTATION/PRODUCTION VERIFICATION**
- Google OAuth customer session.
- Login-first operational gate.
- Authenticated Upload/Drive materialization to canonical B2 quarantine/untrusted input.
- Server-side ownership.
- Google Drive provider/redirect/timeout/size protections.
- Content/signature validation.
- Add/verify anti-malware scanning in existing approved infrastructure; ClamAV is first implementation candidate.
- `.blend/.zip/.rar` archive/Blender safety boundary.
- Scanner error/timeout/unavailable/unknown fails closed.
- `INPUT_SAFE` is server-authoritative.
- Automatically create exactly one customer-owned Job after `INPUT_SAFE`, idempotently and without Founder/Admin/Start Render approval.
- Remove obsolete customer render-tier artifacts.

### M2 — Adaptive autonomous execution
**PARTIAL PRODUCTION RUNTIME VERIFIED; 1-WORKER AND DEADLINE-SCHEDULING PATH NEED VERIFICATION**
- Stable Worker identity/enrollment without per-machine or per-batch Founder/Admin approval in normal fleet operation.
- Approved site/fleet trust is durable; short-lived provisioning capabilities renew automatically while trust remains valid.
- Partner Golden Image includes shared CWS runtime/bootstrap/Blender components; unique Worker credential is per-machine state.
- One canonical Windows startup owner: resident Node Agent auto-start service with duplicate-process protection, bounded retry/backoff and fleet startup jitter.
- Worker Engine remains task-scoped/ephemeral.
- Heartbeat/presence.
- Atomic capability-aware claim.
- Lease/generation fencing.
- Task-scoped download/upload capabilities.
- Analyze project/frame range and create durable non-overlapping Tasks.
- Start initial desired Worker wave without waiting for a separate benchmark-only phase.
- Collect observed real task/frame runtime metrics.
- Continuously project final completion and scale Worker target upward when the 45-minute target is at risk.
- Apply configurable 20–30% safety capacity and integer round-up.
- Prevent concurrent duplicate frame/task ownership.
- Reserve budget for collection/validation and animation assembly/encode.
- Safe extraction, preflight, optimizer, real Blender process, progress, retry/failure handling.

### M3 — Output + preview + price
**CODE VERIFIED; PRODUCTION E2E NEEDS VERIFICATION**
- Collect/validate all expected frame/task outputs.
- Assemble/encode animation deliverable when required.
- Upload full result to B2 LOCKED.
- Generate 3–5 real watermarked previews.
- Final runtime/cost calculation with approved 2.5x multiplier.
- No preview approval gate.

### M4 — Payment + delivery
**CODE/SANDBOX PARTIALLY VERIFIED; GOLDEN E2E NEEDS VERIFICATION**
- Create payment record/code/MB QR after render + locked output + previews.
- SePay exact reference/content + amount verification with idempotency.
- PAID-only authorized B2 download.

### M5 — Golden Production E2E
**NOT YET PROVEN**
Required trace:
1. Real Google-authenticated customer.
2. Real authenticated Upload/Drive input.
3. Materialize to canonical quarantine/untrusted state.
4. Real ownership/provider/size/signature checks.
5. Real anti-malware + archive/Blender structural safety verdict.
6. `INPUT_SAFE`.
7. Automatically create exactly one customer-owned Job with no Founder/Admin and no mandatory Start Render click.
8. Analyze work range and create non-overlapping durable Tasks.
9. Real physical Workers claim distinct Tasks; initial wave targets 10 Workers when capacity permits.
10. Real Blender work produces observed runtime evidence and Scheduler can adapt capacity without duplicate active frame ownership.
11. Real render/finalization completes, including animation assembly/encode when required.
12. Real B2 locked output.
13. Real watermarked previews.
14. Real final price + exact payment content + MB QR.
15. Real SePay exact/idempotent match.
16. Real PAID transition.
17. Real authorized download.
18. Same Job visible in History.
19. Cleanup and Workers return idle.

A build, unit test, simulation, scanner install, deployment READY state or Worker heartbeat alone is not Golden E2E proof.

### M6 — Admin / Operations Control Plane
**ACTIVE ROADMAP COMPONENT; NEXT REFINEMENT CYCLE SEQUENCED AFTER CURRENT CUSTOMER/WORKER GATES**
- Separate Admin frontend remains `cws-admin.vercel.app`.
- Staff Google OAuth + mandatory TOTP/AAL2 + backend role enforcement remain binding for privileged Admin actions.
- Continue Admin jobs/customers/workers/payments/enrollment/logs/system-health functionality.
- Admin is not a mandatory hop in normal Customer or normal already-approved-site Worker runtime.

## 6. Scale Direction
MVP architecture must avoid manual-per-machine, manual-per-batch and manual-per-job operations.
- Immediate gate: exactly one real Worker reaches authenticated `ACTIVE_IDLE` autonomously.
- Then: one real customer Job end-to-end with the new safe-input automatic-Job workflow.
- Then: 2–3 Workers -> 10 Workers -> 25 -> 50 -> 100 control-plane/runtime verification as evidence permits.
- A single Job may legitimately consume many Workers when deadline planning requires it and fleet capacity permits.
- Design must remain logically compatible with 100 / 1,000 / 10,000 / 1,000,000 Workers without assuming those are current deployments.
- Partner Golden Image must not clone one Worker credential across machines.
- Normal reboot must not require re-enrollment when per-machine persistent state is available.
- Approved sites must not require Founder/Admin authorization for each normal new PC batch.
- Do not add Redis/brokers/services before measured evidence shows the existing Postgres control plane is the bottleneck.

`CWS_SCALING_ROADMAP.md` is supporting specialist material and is subordinate to this roadmap.

## 7. Current Priority
Current convergence has two bounded fronts that must not be mixed into one uncontrolled change:

1. **Worker runtime gate:** make exactly one physical Worker provision autonomously through approved-site trust and reach authenticated `ACTIVE_IDLE`; then STOP for Founder review.
2. **Customer Spec 008 security/intent gate:** implement quarantine + anti-malware/structural validation -> authoritative `INPUT_SAFE` -> automatic exactly-one Job creation, with zero Founder/Admin and no mandatory Start Render gate.

After the 1-Worker gate passes, continue one-Worker real Job/Task/render verification before scaling to multiple Workers.
