# CWS Official Decisions — Active

> Reconciled 2026-08-11. This file contains current active decisions only. Superseded/history detail remains available in git history and evidence under `reports/`.

## Product / Roadmap

### [ACTIVE — 2026-08-10] One canonical roadmap
`CWS_ROADMAP.md` is the only active CWS roadmap. Versioned roadmap files are historical and must not be used or recreated as competing source-of-truth instructions.

### [ACTIVE — 2026-08-11] Customer login is the first operational gate
Customer MVP operational flow begins with Google OAuth. Unauthenticated visitors may see product/marketing copy, but Upload/Drive submission is not an operational step until a valid customer session exists.

Canonical front-of-flow order:

`Google Login -> authenticated Upload/Google Drive -> backend materialize into canonical B2 storage -> validate content/signature + ownership -> choose approved render mode -> create customer-owned Job -> Task/Worker execution`

The previous “choose input first, login only when pressing Render” behavior is superseded.

### [ACTIVE] Customer authentication
Customer MVP uses Google OAuth through Supabase Auth. No Facebook, Zalo or customer email/password flow. Customer identity and upload/job ownership are verified server-side.

## Customer Workflow / Pricing / Payment

### [ACTIVE — 2026-08-11] Normal Customer runtime requires zero Admin approval
After Google login and valid input submission, the normal Customer E2E must run automatically without Founder/Admin approval, manual Worker assignment, manual state advancement, manual payment confirmation, or AI intervention.

Canonical normal flow:

`Google Login -> Upload/Drive -> Validate -> Queue -> Scheduler -> Worker -> Render -> B2 -> Preview/Pricing/QR -> SePay verify -> Unlock -> Download -> Cleanup`

Admin is not a mandatory hop in the Customer workflow. Admin is reserved for observability, support, security exceptions, incident handling, system configuration, and explicit exceptional overrides.

### [ACTIVE — 2026-08-11] Customer render-mode choice
Customer chooses service/speed preference, never GPU/CPU hardware.

Current public modes are:
- Economy
- Balanced/Standard
- Priority

Do not expose additional public modes without a new active product decision. Backend/internal compatibility identifiers may remain if required for existing data/contracts.

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

### [ACTIVE — 2026-08-11] Supported public customer input
Customer MVP input supports `.blend`, `.zip`, `.rar`, and approved Google Drive file links. OneDrive, Dropbox and arbitrary direct-link ingestion are not part of the public canonical workflow unless explicitly approved later and backed by real materialization/validation.

Extension alone is not trusted; content/signature and size/resource limits are enforced.

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

### [ACTIVE] Production runtime must work without AI or Admin operation
Normal scheduling, Worker claim/heartbeat, render, progress, retries, storage, payment matching, delivery, cleanup and recovery cannot require ChatGPT/Codex/Founder/Admin intervention.

### [ACTIVE — 2026-08-11] Normal Worker lifecycle requires zero per-machine Founder/Admin approval
Normal Worker enrollment, restart, reconnect, heartbeat, claim, render, cleanup and return-to-idle must not require Founder/Admin to approve each machine individually.

The existing bounded one-time enrollment-ticket mechanism may remain as a security/bootstrap primitive, but the canonical long-term provisioning path must automate issuance/distribution/redemption after a bounded fleet/site onboarding step. Requiring Admin Google OAuth + TOTP/AAL2 for every Worker is not the intended normal operating model.

Allowed human interaction is limited to bounded exceptional/bootstrap operations such as:

- one-time fleet/site onboarding bootstrap
- security incident review
- irreversible/root-secret rotation
- explicit exceptional operations

Not allowed as the canonical normal path:

- Founder approves each Worker
- Admin manually issues one ticket per Worker
- manual DB row creation per Worker
- per-Worker copying of Supabase/B2 master credentials
- Admin intervention on normal Worker restart/reconnect

Target behavior:

`fleet/site onboard once -> unattended/bulk provisioning -> Worker receives/redeems authorized bootstrap material -> creates/stores its own machine-bound identity credential -> heartbeat -> schedulable`

### [ACTIVE — 2026-08-11] Partner net-cafe Golden Image model
For an approved partner net-cafe/office fleet, CWS software is intended to be baked into the partner's canonical Windows/BootROM Golden Image so a normal PC reboot does not remove CWS runtime components.

Golden Image may contain shared non-secret runtime components such as:

- canonical CWS bootstrap/startup wrapper
- Node Agent code
- Worker Engine code
- Blender/runtime dependencies
- shared non-secret Backend/site configuration where appropriate

The Golden Image must **not** contain one shared Worker credential copied to every PC. Each physical PC keeps a distinct Worker identity/credential outside shared image state, using the partner's supported per-machine persistent/writeback mechanism when available.

Normal reboot is therefore expected to be:

`Windows boot -> existing per-machine identity/credential -> Node Agent auto-start -> authenticate -> heartbeat -> ACTIVE_IDLE`

Normal reboot must not re-enroll the Worker. Re-enrollment/credential recovery is reserved for first enrollment, actual credential loss/corruption, reprovisioning/hardware replacement, or revocation recovery.

If a specific BootROM platform cannot persist per-machine credential state, bounded unattended re-enrollment may be used as a fallback; it is not the default reboot model.

### [ACTIVE — 2026-08-11] Canonical Windows process lifecycle
There is one canonical production startup owner: the **Node Agent**.

- Node Agent is the resident background supervisor and auto-starts with Windows using one canonical Windows Service/startup mechanism.
- Preferred production service behavior is automatic startup with delayed/jittered connection so many PCs do not stampede the Backend at once.
- Worker Engine is **not** a second always-running background service. It is launched by Node Agent only for an assigned job/task and exits after completion/failure cleanup.
- After Worker Engine exits, Node Agent remains alive and returns to `ACTIVE_IDLE`.
- Duplicate Node Agent instances must be prevented; competing Startup Folder/Scheduled Task/.bat/service startup paths are not allowed in production.
- Backend/network outages must use bounded retry/backoff without killing the resident Node Agent.
- Worker Engine/Blender crash must not permanently kill Node Agent; Node Agent owns cleanup/recovery according to the canonical state machine.

Canonical runtime shape:

`Windows boot -> Node Agent service -> authenticate/heartbeat -> ACTIVE_IDLE -> claim -> launch Worker Engine -> Blender/render/upload/verify -> Worker Engine exits -> cleanup -> ACTIVE_IDLE`

Legacy `cws_worker_full.py` is not the canonical auto-start production runtime.

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
- Admin frontend: `cws-admin.vercel.app`.
- Both frontends remain in the same canonical GitHub repository but build/deploy independently.
- Admin must mount only the Admin UI tree; Customer UI must not be mounted or used as a routing fallback in the Admin build.
- The split does **not** create a second backend, Supabase project, B2 bucket, Worker fleet, SePay integration, or business-data source of truth.

Admin UX/MFA refinement is currently deferred while Customer Golden E2E is the active bottleneck.

### [ACTIVE] Admin authentication
Admin/Host staff use Google OAuth through Supabase plus required Supabase TOTP/AAL2 and explicit staff role authorization. Customer authentication and Admin authentication are separate flows. A separate hostname is not an authorization bypass; backend role/AAL2 enforcement remains mandatory.

Admin AAL2 is for privileged Admin/staff actions; it is not a mandatory step in normal Customer job execution or normal per-Worker lifecycle.

### [ACTIVE] Customer CRM
Customer profile data from the authenticated Google/Supabase account is available to the Admin Dashboard for customer management/support according to authorization rules.

## Architecture / Scale / Infrastructure

### [ACTIVE — 2026-08-11] Existing infrastructure with one explicitly approved Admin frontend project
Use the existing canonical GitHub repo, Render service, Supabase project, Backblaze B2 resources, Worker environment and SePay setup. The already-created `cws-admin` Vercel project is the only additional approved frontend resource. Do not create any other duplicate infrastructure without explicit Owner approval.

### [ACTIVE] Scale without manual operations
Normal architecture should support growth toward 100/1,000/1,000,000 Workers without manual per-machine/per-job database configuration, copied storage secrets, per-machine Founder/Admin approval or AI runtime intervention. This is a design constraint, not a claim that those fleet sizes are currently deployed.

### [ACTIVE] Evidence levels
Keep `CODE VERIFIED`, `SIMULATION VERIFIED`, and `PRODUCTION RUNTIME VERIFIED` distinct. Builds, unit tests, deployment READY state, heartbeat or historical rows do not establish Golden Production E2E.

## Execution Governance

### [ACTIVE] Mandatory diagnostic + Spec Kit funnel
Every CWS change follows:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> Specify -> Clarify when needed -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

### [ACTIVE] Source-of-truth sync
Completed work updates `CURRENT_STATUS.md`, `CWS_ROADMAP.md`, relevant decisions/context/workflow/architecture docs and evidence. `CURRENT_STATUS.md` stays current-only; historical detail belongs under `reports/` and git history.
