# CWS Roadmap — Canonical

> **Single roadmap source of truth.** Updated 2026-08-11.
> Historical roadmap versions are not active instructions. Runtime evidence under `reports/` remains historical proof.

## 1. Product Goal
Build a production CWS MVP where a customer authenticates with Google, submits a real Blender project, and CWS automatically allocates enough eligible Workers to drive the complete render deliverable toward a 45-minute internal target, then delivers real watermarked previews plus final price/payment QR, verifies Vietnam bank payment by SePay, and unlocks the locked full output.

## 2. Canonical Customer Workflow

`Google Login -> authenticated Upload/Google Drive -> materialize + validate canonical input -> Start render -> create customer-owned Job -> analyze frame/work range -> build durable non-overlapping Tasks -> start initial 10-Worker wave -> measure real completed task/frame runtimes while useful work is already running -> adapt Worker count upward as needed for <=45-minute final-output target -> safe preparation/optimization -> real Blender render -> collect/validate -> animation assembly/encode if required -> upload FULL OUTPUT to B2 LOCKED -> generate 3–5 CWS-watermarked previews -> calculate FINAL PRICE -> create payment record/code/MB QR -> customer pays -> SePay verifies exact reference/content + amount idempotently -> PAID -> authorized B2 download -> History/cleanup/audit`

### Binding business rules
- Customer Google Login is the **first operational gate** for the MVP customer flow.
- Upload/Drive controls are part of the authenticated customer workflow.
- Input is uploaded/materialized and validated before Job creation.
- Supported canonical customer inputs: `.blend`, `.zip`, `.rar`, and approved Google Drive file links.
- Customer render speed/tier selection is removed from the active product. Customer does not choose Worker count, GPU or CPU.
- Active UI/API/domain/persistence must not depend on a customer tier identifier.
- CWS automatically plans parallel capacity.
- Initial runnable render wave targets **10 eligible Workers** when capacity permits.
- First completed real Tasks/frames are runtime evidence; there is no blocking benchmark-only phase.
- If projected final completion exceeds the 45-minute target, CWS scales the same Job upward as eligible capacity is available.
- Capacity planning uses a configurable safety margin initially in the 20–30% range and rounds required Worker count **up** to a whole integer.
- One Task/frame has one active authoritative Worker owner at a time. Reassignment occurs only through the existing lease/generation fencing rules.
- The 45-minute target includes required finalization such as render, collection/validation and animation assembly/encode when applicable. It is an internal mandatory scheduling target, not a public contractual SLA unless separately approved.
- Customer originals are immutable.
- No fake/demo progress, render, payment, or output in production.
- No AI/Founder/Admin intervention is allowed for normal runtime state transitions.
- No payment before real render/output/previews.
- **No customer-approval gate before payment.** Preview is presented together with final price + QR after render.
- Full output is uploaded once, locked before payment, and unlocked after PAID; do not rerender/repackage/reupload just to deliver.
- Final customer pricing keeps the approved **2.5x multiplier** over the verified cost basis. The underlying base rate/cost source is configuration/decision-driven; do not invent a new hard-coded base rate from this roadmap.

## 3. Canonical Architecture
- Customer frontend: existing Vercel project `cws-portal.vercel.app`.
- Admin frontend: separate React/Vite build in the same repo at `cws-admin.vercel.app`; Admin is a core CWS component and remains on the active roadmap.
- Backend/API: one existing Render.com service shared by Customer and Admin.
- Database/Auth: one existing Supabase project; Customer Google OAuth and staff Google OAuth + TOTP/AAL2/role checks remain separate auth flows over the same provider.
- Storage: existing Backblaze B2.
- Render runtime: canonical Windows Node Agent + generic Worker Engine + Blender CLI/background.
- Partner host image model: approved net-cafe/office fleets bake shared CWS runtime components into their Windows/BootROM Golden Image; per-machine Worker identity/credential remains distinct persistent machine state and is never cloned as one shared credential.
- Host process lifecycle: Node Agent is the one resident Windows auto-start supervisor; Worker Engine is launched only for assigned tasks and exits after completion/failure cleanup.
- Normal reboot: load existing per-machine identity/credential -> Node Agent auto-start -> heartbeat -> `ACTIVE_IDLE`; normal reboot does not re-enroll when persistent machine state is available.
- Payment detection: SePay webhook; exact reference/content + amount; idempotent/fail-closed.
- Worker control plane: authenticated Backend gateway; no Supabase service-role key on Workers.
- Scheduling: PostgreSQL durable task ownership using atomic claim/lease/generation fencing plus an **Adaptive Deadline Scheduler** that controls task generation/chunking and desired parallel Worker count from observed real task runtimes. No new broker/Redis until measurement proves a bottleneck.
- Worker storage access: short-lived task/object-scoped capabilities; no long-lived per-Worker B2 keys.
- MVP parallelism is across independent frames/tasks. Distributed tile/sample rendering of one single frame is not part of the current scope.

## 4. Execution / Governance
Every CWS change follows:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> Specify -> Clarify when needed -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

Rules:
- documents before code;
- root cause over symptom;
- production evidence over simulation;
- one current E2E bottleneck at a time;
- existing infrastructure only unless Owner explicitly approves a new resource;
- the already-approved `cws-admin` Vercel frontend does not authorize any other duplicate infrastructure;
- update the engineering learning log after technical/documentation changes.

## 5. Current MVP Milestones

### M0 — Source-of-truth convergence
**IN_PROGRESS (2026-08-11)**
- One canonical roadmap (`CWS_ROADMAP.md`).
- `CURRENT_STATUS.md` is current-only.
- Customer workflow is login-first and uses automatic deadline scheduling with no customer render speed/tier choice.
- Admin remains an active/core roadmap component; its next refinement cycle is sequenced after the current Customer production gate.

### M1 — Customer identity + canonical input
**CODE/SCHEMA PARTIALLY VERIFIED; CUSTOMER UI FLOW NEEDS CONVERGENCE**
- Google OAuth customer session.
- Login-first operational gate.
- Authenticated Upload/Drive materialization to canonical B2 input.
- Server-side ownership and validation.
- `.blend/.zip/.rar` safety boundary.
- Job creation only after materialized/validated customer-owned input.
- Remove all obsolete customer render-tier runtime/API/persistence artifacts.

### M2 — Adaptive autonomous execution
**PARTIAL PRODUCTION RUNTIME VERIFIED; DEADLINE-SCHEDULING PATH NEEDS IMPLEMENTATION/VERIFICATION**
- Stable Worker identity/enrollment without per-machine Founder/Admin approval in normal fleet operation.
- Partner Golden Image includes shared CWS runtime/bootstrap/Blender components; unique Worker credential is per-machine state, not shared image state.
- One canonical Windows startup owner: resident Node Agent auto-start service with duplicate-process protection, bounded retry/backoff and fleet startup jitter.
- Worker Engine remains task-scoped/ephemeral: Node Agent launches it for a claimed task; after render/failure cleanup the Engine exits and Node Agent returns to `ACTIVE_IDLE`.
- Heartbeat/presence.
- Atomic capability-aware claim.
- Lease/generation fencing.
- Task-scoped download/upload capabilities.
- Analyze project/frame range and create durable non-overlapping Tasks.
- Start initial 10-Worker wave without waiting for a separate benchmark-only phase.
- Collect observed real task/frame runtime metrics from useful completed work.
- Continuously project final completion and scale Worker target upward when the 45-minute target is at risk.
- Apply configurable 20–30% safety capacity and round Worker target upward to an integer.
- Prevent concurrent duplicate frame/task ownership.
- Reserve budget for collection/validation and animation assembly/encode when required.
- Safe extraction, preflight, optimizer, real Blender process, progress, retry/failure handling.

### M3 — Output + preview + price
**CODE VERIFIED; PRODUCTION E2E NEEDS VERIFICATION**
- Collect/validate all expected frame/task outputs.
- Assemble/encode animation deliverable when required by the output contract.
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
3. Materialize + validate canonical input.
4. Customer starts render with no render speed/tier choice.
5. Create exactly one customer-owned Job.
6. Analyze work range and create non-overlapping durable Tasks.
7. Real physical Workers claim distinct Tasks; initial wave targets 10 Workers when capacity permits.
8. Real Blender work produces observed runtime evidence and Scheduler can adapt parallel Worker count without duplicate active frame ownership.
9. Real render/finalization completes, including animation assembly/encode when required.
10. Real B2 locked output.
11. Real watermarked previews.
12. Real final price + exact payment content + MB QR.
13. Real SePay exact/idempotent match.
14. Real PAID transition.
15. Real authorized download.
16. Same Job visible in customer History.
17. Cleanup and Workers return idle.

A build, unit test, simulation, deployment READY state, or Worker heartbeat alone is not Golden E2E proof.

### M6 — Admin / Operations Control Plane
**ACTIVE ROADMAP COMPONENT; NEXT REFINEMENT CYCLE SEQUENCED AFTER CURRENT CUSTOMER GATE**
- Separate Admin frontend remains `cws-admin.vercel.app`.
- Staff Google OAuth + mandatory TOTP/AAL2 + backend role enforcement remain binding.
- Continue Admin jobs/customers/workers/payments/enrollment/logs/system-health functionality.
- Continue OAuth/MFA production verification and UX refinement.
- Admin work is delayed in sequence only; it is not abandoned, optional, or removed from MVP operations architecture.

## 6. Scale Direction
MVP architecture must avoid manual-per-machine or manual-per-job operations.
- Near gate: 1 real customer job end-to-end with adaptive scheduling evidence.
- Then: isolated 10 -> 25 -> 50 -> 100 real/control-plane load verification.
- A single Job may legitimately consume many Workers when deadline planning requires it and fleet capacity permits.
- Design must remain compatible with 100 / 1,000 / 1,000,000 Workers without assuming they are current deployment targets.
- Partner Golden Image deployment must not clone one Worker credential across machines.
- Normal reboot must not require re-enrollment when per-machine persistent state is available.
- Do not add Redis/brokers/services before measured evidence shows the existing Postgres control plane is the bottleneck.

`CWS_SCALING_ROADMAP.md` is a supporting specialist document and is subordinate to this roadmap.

## 7. Current Priority
Converge `specs/008-customer-standard-workflow/` to the Founder decision: customer render speed/tier selection is removed and capacity is owned automatically by the Adaptive Deadline Scheduler. Then implement the smallest verified vertical slice in order: validated input -> Start render -> one Job -> task graph -> distinct Task ownership -> initial desired capacity -> observed-runtime feedback -> adaptive scale decision. Customer Golden E2E remains the current bottleneck; Admin continues afterward rather than being dropped.
