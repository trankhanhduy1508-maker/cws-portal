# CWS Official Decisions — Active

> Reconciled 2026-08-12. This file contains current active decisions only. Superseded/history detail remains available in git history and evidence under `reports/`.

## Product / Roadmap

### [ACTIVE — 2026-08-10] One canonical roadmap
`CWS_ROADMAP.md` is the only active CWS roadmap. Versioned roadmap files are historical and must not be used or recreated as competing source-of-truth instructions.

### [ACTIVE — 2026-08-11] Customer login is the first operational gate
Customer MVP operational flow begins with Google OAuth. Unauthenticated visitors may see product/marketing copy, but Upload/Drive submission is not an operational step until a valid customer session exists.

Canonical front-of-flow order:

`Google Login -> authenticated Upload/Google Drive -> backend materialize into canonical B2 storage -> validate content/signature + ownership -> Start render -> create customer-owned Job -> automatic deadline planning + Task/Worker execution`

The previous “choose input first, login only when pressing Render” behavior is superseded.

### [ACTIVE] Customer authentication
Customer MVP uses Google OAuth through Supabase Auth. No Facebook, Zalo or customer email/password flow. Customer identity and upload/job ownership are verified server-side.

## Customer Workflow / Pricing / Payment

### [ACTIVE — 2026-08-11] Normal Customer runtime requires zero Admin approval
After Google login and valid input submission, the normal Customer E2E must run automatically without Founder/Admin approval, manual Worker assignment, manual state advancement, manual payment confirmation, or AI intervention.

Canonical normal flow:

`Google Login -> Upload/Drive -> Validate -> Create Job -> Adaptive Deadline Scheduler -> Worker Tasks -> Render -> B2 -> Preview/Pricing/QR -> SePay verify -> Unlock -> Download -> Cleanup`

Admin is not a mandatory hop in the Customer workflow. Admin is reserved for observability, support, security exceptions, incident handling, system configuration, and explicit exceptional overrides.

### [ACTIVE — 2026-08-11] Customer render speed/tier feature is removed
The former public customer render speed/tier choice is removed from the active product and must not be recreated as compatibility behavior.

Customer does **not** choose a render tier, Worker count, GPU, CPU or hardware. Active frontend, API, domain, public response and persistence contracts must not require a customer tier identifier. After a validated canonical input is ready, the customer starts the render and CWS automatically determines parallel capacity.

The scheduling objective is an internal mandatory product target: **drive the complete render deliverable toward <=45 minutes from render start to final validated output**, including frame rendering and, when applicable, frame collection/assembly/encode. This is not a public contractual SLA unless separately approved.

### [ACTIVE — 2026-08-11] CWS Adaptive Deadline Scheduler
CWS uses a deadline-driven, work-conserving scheduler instead of a blocking benchmark-first phase.

Canonical behavior:

1. Backend analyzes the canonical project enough to determine frame/work range and build durable non-overlapping Tasks.
2. Scheduler starts an initial wave of **10 Workers** as soon as runnable Tasks exist, subject to real fleet capacity and eligibility.
3. Those Workers perform real production Tasks immediately; CWS does not reserve a Worker solely to wait for a synthetic benchmark.
4. The first completed real frames/tasks provide observed runtime evidence (`seconds/frame`, task runtime, remaining work).
5. Scheduler continuously projects final completion time from remaining work, observed runtime and reserved non-render overhead.
6. If projected final completion exceeds the 45-minute target, Scheduler scales the same Job upward as eligible capacity is available.
7. Capacity calculation includes a configurable safety margin initially in the **20–30%** range and converts the result to a whole Worker count by **rounding up**, never down.
8. Worker count is always an integer. No fractional Worker allocation exists.

The exact scaling formula and safety factor are implementation/configuration details and must be measurable/tunable; do not expose them as customer choices.

### [ACTIVE — 2026-08-11] No concurrent duplicate frame ownership
A render frame/task may have only one active owner at a time.

- Scheduler partitions the Job into durable, non-overlapping Tasks.
- Atomic claim + lease + generation fencing prevents two active Workers from rendering the same Task/frame concurrently.
- A failed/expired Task may be reassigned only after its prior lease is no longer authoritative and the generation is advanced according to the existing fencing model.
- Do not use speculative duplicate rendering as the normal CWS path without a new Founder decision.

### [ACTIVE — 2026-08-11] 45-minute budget includes finalization
The 45-minute target is not “frame render only.” Internal scheduling must reserve time for downstream work required to produce the final deliverable, including as applicable:

- project analysis/preparation and dispatch overhead;
- remaining render work;
- retry/straggler reserve;
- output collection/validation;
- animation frame assembly/encode/finalization.

A Job is not considered within the target merely because all frame Tasks finished while required assembly/encode still remains.

For MVP, CWS optimizes horizontal parallelism across independent frames/tasks. Splitting one single slow frame across multiple Workers (tile/sample distributed single-frame rendering) is not part of this decision and requires a separate future design if evidence proves it necessary.

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

### [ACTIVE — 2026-08-12] Worker identity and enrollment are automatic; no per-machine manual ticket or Worker ID
Founder must **not** manually choose/type a Worker ID, manually issue one enrollment ticket for each normal Worker, or repeat an enrollment approval for each job.

Worker identity is a system concern, not a Founder-entered business field. On first authorized provisioning of a physical PC, the CWS provisioning/enrollment path must automatically create a unique stable Worker ID and obtain/store that machine's credential through the authenticated Backend boundary.

The existing one-time enrollment-ticket mechanism may remain internally as a bounded security primitive, but normal provisioning must issue/distribute/redeem any required bootstrap material automatically after a bounded fleet/site authorization. The normal operator must not copy ticket strings or Worker IDs from Admin into each PC.

Canonical target behavior:

`approved fleet/site bootstrap -> unattended PC provisioning -> Backend/system generates unique Worker ID -> authorized bootstrap material is issued/redeemed automatically -> machine-bound credential stored -> Node Agent authenticates -> heartbeat -> ACTIVE_IDLE`

Binding rules:

- Worker ID is generated by the system and is unique/stable for the physical Worker identity;
- Worker ID is not generated per job and must not change between jobs;
- no enrollment action is required when a customer creates a Job;
- no Founder/Admin approval is required for normal Worker claim/render/reconnect;
- no manual Admin AAL2 ticket issuance per normal Worker;
- no manual DB row creation per Worker;
- no shared credential copied to multiple PCs;
- normal reboot/reconnect reuses the existing machine identity/credential and does not re-enroll;
- recovery/re-enrollment is reserved for credential loss/corruption, reprovisioning/hardware replacement, revocation/security recovery, or another explicit exceptional bootstrap condition.

For the current single-PC MVP/runtime test, if the existing implementation still blocks on manual Worker ID/ticket input, treat that as a **provisioning implementation gap to fix**, not as the desired workflow and not as a Founder step to repeat manually.

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

### [ACTIVE — 2026-08-12] Worker identity/enrollment
Workers use a stable, system-generated identity with authenticated enrollment. Do not infer identity from hostname/GPU/registration age, and do not require Founder/Admin to type or select the identity for normal provisioning. No shared fleet secret or manual per-Worker DB edits are allowed as the normal scale path.

### [ACTIVE] Worker gateway boundary
Workers use the authenticated Backend gateway. Direct `anon`/`authenticated` execution of internal Worker/fleet Supabase RPCs is forbidden. Workers never receive Supabase service-role credentials.

### [ACTIVE] Storage capability boundary
Long-lived B2 credentials remain server-side. Workers receive short-lived exact task/object-scoped GET/PUT capabilities only for current fenced assignments.

### [ACTIVE] Scheduler boundary
Keep the existing PostgreSQL durable queue/atomic claim/lease/generation fencing architecture. The Adaptive Deadline Scheduler is implemented **on top of this existing durable task model**: it changes task generation/capacity decisions, not the ownership/security boundary.

Do not add OmniRoute as a production dependency or scheduler replacement. No Redis/broker/service is added until measured evidence proves the current control plane is the bottleneck.

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

Admin AAL2 is for privileged Admin/staff actions; it is not a mandatory step in normal Customer job execution or normal per-Worker lifecycle/provisioning.

### [ACTIVE] Customer CRM
Customer profile data from the authenticated Google/Supabase account is available to the Admin Dashboard for customer management/support according to authorization rules.

## Architecture / Scale / Infrastructure

### [ACTIVE — 2026-08-11] Existing infrastructure with one explicitly approved Admin frontend project
Use the existing canonical GitHub repo, Render service, Supabase project, Backblaze B2 resources, Worker environment and SePay setup. The already-created `cws-admin` Vercel project is the only additional approved frontend resource. Do not create any other duplicate infrastructure without explicit Owner approval.

### [ACTIVE] Scale without manual operations
Normal architecture should support growth toward 100/1,000/1,000,000 Workers without manual per-machine/per-job database configuration, copied storage secrets, per-machine Founder/Admin approval, manual Worker-ID entry, per-Worker ticket handling, or AI runtime intervention. This is a design constraint, not a claim that those fleet sizes are currently deployed.

### [ACTIVE] Evidence levels
Keep `CODE VERIFIED`, `SIMULATION VERIFIED`, and `PRODUCTION RUNTIME VERIFIED` distinct. Builds, unit tests, deployment READY state, heartbeat or historical rows do not establish Golden Production E2E.

## Execution Governance

### [ACTIVE — 2026-08-11] CWS AI Engineering Harness is mandatory before code
`CWS_AI_ENGINEERING_HARNESS_V1.md` is the active AI-assisted engineering control framework for CWS.

Every coding agent must enter through `AGENTS.md`, read/apply the Harness before implementation, then load the active decisions/current spec and only task-relevant specialist protocols.

Binding governance rules:

- **code is the final execution phase, not the starting point**;
- material work must pass grounding, diagnosis, decision-boundary, specification/planning/analyze gates before implementation;
- low-risk local fixes may use the Harness shortened L1 path, but still require grounding, diagnosis, targeted verification and evidence;
- AI may choose implementation details inside an approved boundary, but may not silently change product intent, workflow, architecture, security, infrastructure, payment/data rules or other Founder-controlled boundaries;
- evidence level limits completion language; agent claims alone are not proof;
- the Harness complements the existing GitHub Spec Kit/constitution, grounding/staleness policies and `CWS_AI_OPERATING_PLAYBOOK.md`; it does not replace product/runtime source-of-truth documents.

### [ACTIVE] Mandatory diagnostic + Spec Kit funnel
Every CWS material change follows:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> Specify -> Clarify when needed -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

### [ACTIVE] Source-of-truth sync
Completed work updates `CURRENT_STATUS.md`, `CWS_ROADMAP.md`, relevant decisions/context/workflow/architecture docs and evidence. `CURRENT_STATUS.md` stays current-only; historical detail belongs under `reports/` and git history.
