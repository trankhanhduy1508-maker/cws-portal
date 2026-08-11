# CWS Roadmap — Canonical

> **Single roadmap source of truth.** Updated 2026-08-11.
> Historical roadmap versions are not active instructions. Runtime evidence under `reports/` remains historical proof.

## 1. Product Goal
Build a production CWS MVP where a customer can submit a real Blender project, have an authenticated distributed Worker render it autonomously, review watermarked previews, pay by Vietnam bank QR, and download the locked full output after exact SePay verification.

## 2. Canonical Customer Workflow

`Google Login -> Upload/Google Drive -> materialize + validate canonical input -> create Job -> durable Task -> authenticated Worker claim -> extract/discover -> Blender preflight -> immutable-original working copy -> safe optimization -> real Blender render -> real progress -> validate output -> upload FULL OUTPUT to B2 LOCKED -> generate 3–5 CWS-watermarked previews -> calculate FINAL PRICE -> create payment record/code/MB QR -> customer pays -> SePay verifies exact reference + amount idempotently -> PAID -> authorized B2 download -> cleanup/audit`

### Binding business rules
- Customer Google Login is required for the MVP customer flow.
- Input is uploaded/materialized and validated before the Job is created.
- Supported canonical customer inputs: `.blend`, `.zip`, `.rar`, and approved Google Drive file links.
- Customer originals are immutable.
- No fake/demo progress, render, payment, or output in production.
- No AI/Founder intervention is allowed for normal runtime state transitions.
- No payment before real render/output/previews.
- **No customer-approval gate before payment.** Preview is presented together with final price + QR after render.
- Full output is uploaded once, locked before payment, and unlocked after PAID; do not rerender/repackage/reupload just to deliver.
- Final customer pricing keeps the approved **2.5x multiplier** over the verified cost basis. The underlying base rate/cost source is configuration/decision-driven; do not invent a new hard-coded base rate from this roadmap.

## 3. Canonical Architecture
- Customer frontend: existing Vercel project `cws-portal.vercel.app`.
- Admin frontend: separate React/Vite build in the same repo, target Vercel hostname `cws-admin.vercel.app`; Admin build mounts only the Admin tree.
- Backend/API: one existing Render.com service shared by Customer and Admin.
- Database/Auth: one existing Supabase project; Customer Google OAuth and staff Google OAuth + TOTP/AAL2/role checks remain separate auth flows over the same provider.
- Storage: existing Backblaze B2.
- Render runtime: canonical Windows Node Agent + generic Worker Engine + Blender CLI/background.
- Payment detection: SePay webhook; exact reference/content + amount; idempotent/fail-closed.
- Worker control plane: authenticated Backend gateway; no Supabase service-role key on Workers.
- Scheduling: PostgreSQL durable task ownership using atomic claim/lease/generation fencing; no new broker/Redis until measurement proves a bottleneck.
- Worker storage access: short-lived task/object-scoped capabilities; no long-lived per-Worker B2 keys.
- Frontend isolation rule: Customer UI must not be used as an Admin fallback; the separate Admin hostname does not weaken backend authorization.

## 4. Execution / Governance
Every CWS change follows:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> Specify -> Clarify when needed -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

Rules:
- documents before code;
- root cause over symptom;
- production evidence over simulation;
- one current E2E bottleneck at a time;
- existing infrastructure only unless Owner explicitly approves a new resource;
- the Owner explicitly approved one additional Vercel frontend project named `cws-admin` on 2026-08-11; this does not authorize any other duplicate infrastructure;
- update the engineering learning log after technical/documentation changes.

## 5. Current MVP Milestones

### M0 — Source-of-truth convergence
**IN_PROGRESS (2026-08-11)**
- One canonical roadmap (`CWS_ROADMAP.md`).
- `CURRENT_STATUS.md` is current-only.
- `PROJECT_CONTEXT.md`, workflow, decisions, constitution, and agent rules agree.
- Obsolete roadmap versions removed from active repository instructions.
- Customer/Admin frontend boundary reflects the Founder-approved separate Admin deployment.

### M1 — Customer identity + canonical input
**CODE/SCHEMA PARTIALLY VERIFIED; PRODUCTION E2E NEEDS VERIFICATION**
- Google OAuth customer session.
- Upload/Drive materialization to canonical B2 input.
- Server-side ownership and validation.
- `.blend/.zip/.rar` safety boundary.
- Job creation only after materialized/validated customer-owned input.

### M2 — Worker autonomous execution
**PARTIAL PRODUCTION RUNTIME VERIFIED; FULL TASK PATH NEEDS VERIFICATION**
- Stable Worker identity/enrollment.
- Heartbeat/presence.
- Atomic capability-aware claim.
- Lease/generation fencing.
- Task-scoped download/upload capabilities.
- Safe extraction, preflight, optimizer, real Blender process, progress, retry/failure handling.

### M3 — Output + preview + price
**CODE VERIFIED; PRODUCTION E2E NEEDS VERIFICATION**
- Validate output.
- Upload full result to B2 LOCKED.
- Generate 3–5 real watermarked previews.
- Final runtime/cost calculation with approved 2.5x multiplier.

### M4 — Payment + delivery
**CODE/SANDBOX PARTIALLY VERIFIED; GOLDEN E2E NEEDS VERIFICATION**
- Create payment record/code/MB QR after render + locked output + previews.
- SePay exact reference/content + amount verification with idempotency.
- PAID-only authorized B2 download.

### M5 — Golden Production E2E
**NOT YET PROVEN**
Required trace:
1. Real Google-authenticated customer.
2. Real customer Upload/Drive input.
3. Materialize + validate.
4. Create customer-owned Job/Task.
5. Real physical Worker claim.
6. Real Blender process and progress.
7. Real B2 locked output.
8. Real watermarked previews.
9. Real final price + QR.
10. Real SePay sandbox/live-equivalent match.
11. Real PAID transition.
12. Real authorized download.
13. Cleanup and Worker returns idle.

A build, unit test, simulation, deployment READY state, or Worker heartbeat alone is not Golden E2E proof.

## 6. Scale Direction
MVP architecture must avoid manual-per-machine or manual-per-job operations.
- Near gate: 1 real customer job end-to-end.
- Then: isolated 10 -> 25 -> 50 -> 100 real/control-plane load verification.
- Design must remain compatible with 100 / 1,000 / 1,000,000 Workers without assuming they are current deployment targets.
- Do not add Redis/brokers/services before measured evidence shows the existing Postgres control plane is the bottleneck.

`CWS_SCALING_ROADMAP.md` is a supporting specialist document and is subordinate to this roadmap.

## 7. Current Priority
Complete the Founder-approved separate Admin frontend deployment and production verification without duplicating backend/data infrastructure. After `cws-admin.vercel.app` is verified, return immediately to the first real Golden Production E2E bottleneck from `CURRENT_STATUS.md`.
