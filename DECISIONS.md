# CWS Official Decisions — Active

> Reconciled 2026-08-11. This file contains current active decisions only. Superseded/history detail remains available in git history and evidence under `reports/`.

## Product / Roadmap

### [ACTIVE — 2026-08-10] One canonical roadmap
`CWS_ROADMAP.md` is the only active CWS roadmap. Versioned roadmap files (`CWS_ROADMAP_MVP_V1.md`, Production E2E V2.2/V2.3/V2.4) are historical and must not be used or recreated as competing source-of-truth instructions.

### [ACTIVE — 2026-08-10] Canonical customer input/job order
Customer flow begins:

`Google Login -> Upload/Google Drive -> backend materialize into canonical B2 storage -> validate content/signature + ownership -> create customer-owned Job -> Task/Worker execution`

Do not create the production Job before the submitted input has been materialized/validated and bound to the authenticated customer.

### [ACTIVE] Customer authentication
Customer MVP uses Google OAuth through Supabase Auth. No Facebook, Zalo or customer email/password flow. Customer identity and upload/job ownership are verified server-side.

## Customer Workflow / Pricing / Payment

### [ACTIVE — 2026-08-10] Render-before-payment; no customer approval gate
Canonical order:

`real render -> validate -> full B2 output LOCKED -> 3–5 real CWS-watermarked previews -> final price + payment reference + MB QR -> SePay exact reference/content + amount verification -> PAID -> authorized B2 download`

A customer preview-approval action is **not** a prerequisite for payment. Do not re-render/repackage/re-upload after PAID merely to deliver an already-completed output.

### [ACTIVE — 2026-08-10] Pricing multiplier
Final customer pricing retains the approved **2.5x multiplier** over the verified runtime/cost basis. The base rate/cost basis remains configuration/approved-decision driven; do not invent a new hard-coded base rate during documentation reconciliation.

### [ACTIVE] Payment method
MVP uses Vietnam bank QR and SePay webhook. No MoMo/PayPal. Webhook processing is authenticated, idempotent and fail-closed. Exact payment reference/content and amount must match before PAID/unlock.

### [ACTIVE] SePay architecture
Use SePay webhook for the main MVP payment-detection path. Sandbox/test and live remain isolated at credential/endpoint level but share the same matching/idempotency rules.

## Input / Blender / Output

### [ACTIVE] Supported input
Customer input supports `.blend`, `.zip`, `.rar`, and approved Google Drive file links. Extension alone is not trusted; content/signature and size/resource limits are enforced.

### [ACTIVE] B2-first canonical materialization
Production customer input is materialized into canonical B2 storage before Worker processing. Google Drive is an ingestion source, not a reason for every Worker to need a Drive API key.

### [ACTIVE] Archive safety
ZIP/RAR extraction occurs only in a bounded per-job sandbox with path traversal/sandbox-escape/bomb/resource protections and deterministic `.blend` selection.

### [ACTIVE] Immutable original + safe optimization
Customer original input remains immutable. Blender preparation uses:

`read-only analysis -> working copy -> safe deterministic optimization -> validation -> render`

Automatic optimization may not silently change customer visual/animation semantics. Untrusted `.blend` Python autoexec remains disabled unless an explicit trusted contract permits it.

### [ACTIVE] Output locking
Full output is validated and uploaded to B2 before payment, remains locked until PAID, and is delivered by narrow authorized download capability after payment verification.

## Worker / Scheduler / Security

### [ACTIVE] Production runtime must work without AI
Normal scheduling, Worker claim/heartbeat, render, progress, retries, storage, payment matching, delivery, cleanup and recovery cannot require ChatGPT/Codex/Founder intervention.

### [ACTIVE] Worker identity/enrollment
Workers use stable system-managed identity with authenticated enrollment. Do not infer identity from hostname/GPU/registration age. No shared fleet secret or manual per-Worker DB edits as the normal scale path.

### [ACTIVE] Worker gateway boundary
Workers use the authenticated Backend gateway. Direct `anon`/`authenticated` execution of internal Worker/fleet Supabase RPCs is forbidden. Workers never receive Supabase service-role credentials.

### [ACTIVE] Storage capability boundary
Long-lived B2 credentials remain server-side. Workers receive short-lived exact task/object-scoped GET/PUT capabilities only for current fenced assignments.

### [ACTIVE] Scheduler boundary
Keep the existing PostgreSQL durable queue/atomic claim/lease/generation fencing architecture. Do not add OmniRoute as a production dependency or scheduler replacement. No Redis/broker/service is added until measured evidence proves the current control plane is the bottleneck.

### [ACTIVE] Failure/retry boundary
Worker operation retry is bounded and jittered. Task failover/retry authority remains owned by the backend/Postgres lease/generation model. Security violations fail closed.

## Admin / Staff

### [ACTIVE — 2026-08-11] Separate Admin frontend and hostname
Admin is a separate frontend application and production hostname from the Customer Portal.

- Customer frontend: `cws-portal.vercel.app`.
- Admin frontend target: `cws-admin.vercel.app`.
- Both frontends remain in the same canonical GitHub repository but build/deploy independently.
- Admin must mount only the Admin UI tree; Customer UI must not be mounted or used as a routing fallback in the Admin build.
- The split does **not** create a second backend, Supabase project, B2 bucket, Worker fleet, SePay integration, or business-data source of truth.
- Keep the legacy Customer Portal `/admin` route only as a temporary rollback path until the separate Admin production hostname is verified; then retire or redirect it in a follow-up.

### [ACTIVE] Admin authentication
Admin/Host staff use Google OAuth through Supabase plus required Supabase TOTP/AAL2 and explicit staff role authorization. Customer authentication and Admin authentication are separate flows. A separate hostname is not an authorization bypass; backend role/AAL2 enforcement remains mandatory.

### [ACTIVE] Customer CRM
Customer profile data from the authenticated Google/Supabase account is available to the Admin Dashboard for customer management/support according to authorization rules.

## Architecture / Scale / Infrastructure

### [ACTIVE — 2026-08-11] Existing infrastructure with one explicitly approved Admin frontend project
Use the existing canonical GitHub repo, Render service, Supabase project, Backblaze B2 resources, Worker environment and SePay setup. The Founder explicitly approved one additional Vercel frontend project for the separate Admin application (`cws-admin`). Do not create any other duplicate infrastructure without explicit Owner approval.

### [ACTIVE] Scale without manual operations
Normal architecture should support growth toward 100/1,000/1,000,000 Workers without manual per-machine/per-job database configuration, copied storage secrets or AI runtime intervention. This is a design constraint, not a claim that those fleet sizes are currently deployed.

### [ACTIVE] Evidence levels
Keep `CODE VERIFIED`, `SIMULATION VERIFIED`, and `PRODUCTION RUNTIME VERIFIED` distinct. Builds, unit tests, deployment READY state, heartbeat or historical rows do not establish Golden Production E2E.

## Execution Governance

### [ACTIVE] Mandatory diagnostic + Spec Kit funnel
Every CWS change follows:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> Specify -> Clarify when needed -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

### [ACTIVE] Source-of-truth sync
Completed work updates `CURRENT_STATUS.md`, `CWS_ROADMAP.md`, relevant decisions/context/workflow/architecture docs and evidence. `CURRENT_STATUS.md` stays current-only; historical detail belongs under `reports/` and git history.
