# CWS Roadmap — Canonical

> **Single roadmap source of truth.** Updated 2026-08-11.
> Historical roadmap versions are not active instructions. Runtime evidence under `reports/` remains historical proof.

## 1. Product Goal
Build a production CWS MVP where a customer authenticates with Google, submits a real Blender project, has an authenticated distributed Worker render it autonomously, receives real watermarked previews plus final price/payment QR, pays by Vietnam bank QR, and downloads the locked full output after exact SePay verification.

## 2. Canonical Customer Workflow

`Google Login -> authenticated Upload/Google Drive -> materialize + validate canonical input -> choose Economy/Balanced(Standard)/Priority -> Start render -> create customer-owned Job + durable Task -> authenticated Worker claim -> extract/discover -> Blender preflight -> immutable-original working copy -> safe optimization -> real Blender render -> real progress -> validate output -> upload FULL OUTPUT to B2 LOCKED -> generate 3–5 CWS-watermarked previews -> calculate FINAL PRICE -> create payment record/code/MB QR -> customer pays -> SePay verifies exact reference/content + amount idempotently -> PAID -> authorized B2 download -> History/cleanup/audit`

### Binding business rules
- Customer Google Login is the **first operational gate** for the MVP customer flow.
- Upload/Drive controls are part of the authenticated customer workflow.
- Input is uploaded/materialized and validated before render-mode selection can create a Job.
- Supported canonical customer inputs: `.blend`, `.zip`, `.rar`, and approved Google Drive file links.
- Customer chooses service/speed preference only; no GPU/CPU hardware selection.
- Current public modes: Economy / Balanced(Standard) / Priority. Do not add public modes without an active product decision.
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
- Payment detection: SePay webhook; exact reference/content + amount; idempotent/fail-closed.
- Worker control plane: authenticated Backend gateway; no Supabase service-role key on Workers.
- Scheduling: PostgreSQL durable task ownership using atomic claim/lease/generation fencing; no new broker/Redis until measurement proves a bottleneck.
- Worker storage access: short-lived task/object-scoped capabilities; no long-lived per-Worker B2 keys.

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
- Customer workflow is being reconverged around a login-first operational flow.
- Admin remains an active/core roadmap component; its next refinement cycle is sequenced after the current Customer production gate.

### M1 — Customer identity + canonical input
**CODE/SCHEMA PARTIALLY VERIFIED; CUSTOMER UI FLOW NEEDS CONVERGENCE**
- Google OAuth customer session.
- Login-first operational gate.
- Authenticated Upload/Drive materialization to canonical B2 input.
- Server-side ownership and validation.
- `.blend/.zip/.rar` safety boundary.
- Job creation only after materialized/validated customer-owned input and approved render-mode selection.

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
4. Choose approved render mode.
5. Create exactly one customer-owned Job/Task.
6. Real physical Worker claim.
7. Real Blender process and progress.
8. Real B2 locked output.
9. Real watermarked previews.
10. Real final price + exact payment content + MB QR.
11. Real SePay exact/idempotent match.
12. Real PAID transition.
13. Real authorized download.
14. Same Job visible in customer History.
15. Cleanup and Worker returns idle.

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
- Near gate: 1 real customer job end-to-end.
- Then: isolated 10 -> 25 -> 50 -> 100 real/control-plane load verification.
- Design must remain compatible with 100 / 1,000 / 1,000,000 Workers without assuming they are current deployment targets.
- Do not add Redis/brokers/services before measured evidence shows the existing Postgres control plane is the bottleneck.

`CWS_SCALING_ROADMAP.md` is a supporting specialist document and is subordinate to this roadmap.

## 7. Current Priority
Implement `specs/008-customer-standard-workflow/` and converge the Customer Portal around the canonical login-first workflow. This is a **sequencing decision**: Customer Golden E2E is the current bottleneck. After the Customer workflow reaches its next verified production gate, continue the Admin/operations control-plane work rather than dropping it.
