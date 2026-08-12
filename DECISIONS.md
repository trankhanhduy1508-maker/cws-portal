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

### [ACTIVE — 2026-08-12] Worker identity and enrollment are automatic; no per-machine or per-batch Founder operation
Founder must **not** manually choose/type a Worker ID, manually issue one enrollment ticket for each normal Worker, repeat an enrollment approval for each Job, or approve each normal new PC batch at a site/fleet that CWS already trusts.

Worker identity is a system concern. On first provisioning of a physical PC at an approved site, CWS automatically creates a unique stable Worker ID and obtains/stores that machine credential through the Backend boundary.

The existing one-time enrollment-ticket mechanism may remain internally as a bounded security primitive, but normal provisioning must issue/distribute/redeem it automatically. The operator must not copy ticket strings or Worker IDs into each PC.

Canonical target behavior:

`site/fleet approved once -> durable approved-site trust -> unattended batch provisioning -> Backend-generated Worker IDs -> bounded enrollment material auto-issued/redeemed -> per-Worker credential -> DPAPI -> Node Agent -> heartbeat -> ACTIVE_IDLE`

Binding rules:

- Worker ID is generated by the system and is unique/stable for the physical Worker identity;
- Worker ID is not generated per Job;
- no enrollment action is required when a customer creates a Job;
- no Founder/Admin approval is required for normal Worker claim/render/reconnect;
- no manual Admin AAL2 ticket issuance per normal Worker;
- no Founder/Admin AAL2 authorization per normal batch at an already-approved site;
- no manual DB row creation per Worker;
- no shared credential copied to multiple PCs;
- normal reboot/reconnect reuses existing identity/credential and does not re-enroll;
- recovery/re-enrollment is reserved for exceptional credential/trust/security events.

If current implementation still requires a fresh Admin AAL2 site-bootstrap action before each new batch, that is a **provisioning implementation gap**, not a Founder step.

### [ACTIVE — 2026-08-12] One physical PC has one canonical PCID/Worker ID; no separate PCID namespace
Founder supersedes any earlier design that treats `PCID` and `Worker ID` as two separate identifiers for the current CWS machine model.

Canonical identity rule:

`1 physical PC = 1 canonical PCID/Worker ID`

`PCID` is only an alias for the same canonical `worker_id` value.

ID generation requirements:

- Backend is the sole canonical ID generator during first provisioning.
- Generate **128 bits of cryptographically secure random entropy**; preferred presentation is `cwsw_` + 32 lowercase hexadecimal characters.
- Database `PRIMARY KEY`/`UNIQUE` enforcement is mandatory.
- Collision -> reject -> fresh random ID -> bounded/idempotent retry; never overwrite/merge machines.
- ID is opaque and does not encode hostname, site, GPU, MachineGuid, serial, fingerprint, customer, Job, or sequential count.
- Same ID survives reboot, reconnect, and normal Jobs.
- Scheduler, heartbeat, logs, Worker state, task ownership and host accounting use this single canonical ID.

Machine fingerprint is security evidence only and must never become a second PC identity.

Historical reports/legacy code describing separate PCID, sequential PC numbering, MachineGuid-derived identity, or another second machine-ID namespace are superseded as active design guidance.

### [ACTIVE — 2026-08-12] Approved site/fleet autonomy; no repeated Founder authorization per batch
Founder approved the concrete scale/security contract:

- a site/fleet is onboarded through a privileged authenticated Backend boundary **once**;
- that onboarding establishes durable server-side APPROVED site/fleet trust;
- Backend/site controller may use a site-scoped controller credential/trust anchor limited to provisioning for that site/fleet;
- the site-controller credential is not a Worker credential, not a Supabase service-role credential, and grants no Worker claim/render/payment/B2-master authority;
- short-lived provisioning capabilities/tokens may expire, but they must be **automatically renewed/exchanged/rotated** while durable site approval remains active and server policy permits;
- token expiry is not equivalent to site approval expiry;
- Founder/Admin must not log in or call `POST /worker/enrollment/site-bootstrap` for every future PC batch at an already-approved site;
- `POST /worker/enrollment/site-bootstrap` may remain for first onboarding, explicit trust reset, exceptional privileged rotation, ownership change, suspension/revocation recovery, or similar security-sensitive events;
- site controller scope, quota/rate/capacity policy, revocation and audit remain enforced server-side;
- Backend generates canonical Worker IDs transactionally;
- enrollment uses composite fingerprint evidence;
- bootstrap/ticket material for each Worker is issued automatically and bound to site/fleet + generated Worker ID + fingerprint evidence;
- missing/revoked/suspended site authorization, wrong controller, cross-site use, fingerprint mismatch, replay, or invalid binding fails closed;
- normal reboot/reconnect reuses per-Worker identity + DPAPI credential.

Canonical approved-site provisioning direction:

`site approved once -> durable site trust -> autonomous site-controller capability renewal -> unattended PC bootstrap -> fingerprint evidence -> Backend-generated PCID/Worker ID -> bounded enrollment material -> redeem -> per-Worker credential -> DPAPI -> Node Agent -> heartbeat -> ACTIVE_IDLE`

Detailed contract: `specs/009-automatic-worker-provisioning/spec.md`.

### [ACTIVE — 2026-08-11] Partner net-cafe Golden Image model
For an approved partner net-cafe/office fleet, CWS software is intended to be baked into the partner's canonical Windows/BootROM Golden Image so reboot does not remove runtime components.

Golden Image may contain shared non-secret runtime components such as:

- canonical bootstrap/startup wrapper
- Node Agent code
- Worker Engine code
- Blender/runtime dependencies
- non-secret Backend/site identifiers/configuration

Golden Image must **not** contain a shared Worker credential or the site-controller root/trust secret. Each physical PC keeps a distinct Worker identity/credential outside shared image state using supported per-machine persistent/writeback storage when available.

Normal reboot:

`Windows boot -> existing per-machine identity/credential -> Node Agent -> authenticate -> heartbeat -> ACTIVE_IDLE`

Normal reboot does not re-enroll. Bounded unattended re-enrollment is exceptional/fallback only.

### [ACTIVE — 2026-08-11] Canonical Windows process lifecycle
There is one canonical production startup owner: the **Node Agent**.

- Node Agent is the resident background supervisor and auto-starts with Windows using one canonical Windows Service/startup mechanism.
- Prefer delayed/jittered connection so many PCs do not stampede Backend.
- Worker Engine is not a second always-running service; Node Agent launches it only for assigned work and it exits after cleanup.
- After Worker Engine exits, Node Agent remains alive and returns to `ACTIVE_IDLE`.
- Duplicate Node Agent instances are forbidden.
- Backend/network outages use bounded retry/backoff.
- Worker Engine/Blender crash must not permanently kill Node Agent.

Canonical runtime:

`Windows boot -> Node Agent service -> authenticate/heartbeat -> ACTIVE_IDLE -> claim -> launch Worker Engine -> Blender/render/upload/verify -> Worker Engine exits -> cleanup -> ACTIVE_IDLE`

Legacy `cws_worker_full.py` is not the canonical auto-start production runtime.

### [ACTIVE — 2026-08-12] Worker identity/enrollment
Workers use a stable, system-generated identity with authenticated enrollment. Do not infer identity from hostname/GPU/registration age, and do not require Founder/Admin to type/select the identity or approve each normal batch at an already-approved site. No shared fleet Worker secret or manual per-Worker DB edits are allowed as the normal scale path.

### [ACTIVE] Worker gateway boundary
Workers use the authenticated Backend gateway. Direct `anon`/`authenticated` execution of internal Worker/fleet Supabase RPCs is forbidden. Workers never receive Supabase service-role credentials.

### [ACTIVE] Storage capability boundary
Long-lived B2 credentials remain server-side. Workers receive short-lived exact task/object-scoped GET/PUT capabilities only for current fenced assignments.

### [ACTIVE] Scheduler boundary
Keep the existing PostgreSQL durable queue/atomic claim/lease/generation fencing architecture. Adaptive Deadline Scheduler is implemented on top of this durable task model.

Do not add OmniRoute as a production dependency or scheduler replacement. No Redis/broker/service until measured evidence proves need.

### [ACTIVE] Failure/retry boundary
Worker retry is bounded and jittered. Task failover/retry authority remains owned by backend/Postgres lease/generation model. Security violations fail closed.

## Admin / Staff

### [ACTIVE — 2026-08-11] Separate Admin frontend and hostname
Admin is a separate frontend application and production hostname from Customer Portal.

- Customer frontend: `cws-portal.vercel.app`.
- Admin frontend: `cws-admin.vercel.app`.
- Both remain in the same canonical GitHub repo but build/deploy independently.
- Admin mounts only Admin UI; Customer UI is not an Admin fallback.
- Split does not create a second Backend, Supabase, B2, Worker fleet, SePay integration, or business-data source of truth.

Admin UX/MFA refinement remains deferred while Customer/Worker Golden E2E is the active bottleneck.

### [ACTIVE] Admin authentication
Admin/Host use Google OAuth through Supabase plus required TOTP/AAL2 and explicit staff role authorization. Customer and Admin authentication are separate flows.

Admin AAL2 is for privileged Admin/staff actions; it is not a mandatory step in normal Customer execution, normal per-Worker lifecycle/provisioning, or each normal new PC batch at an already-approved site/fleet.

### [ACTIVE] Customer CRM
Customer profile data from authenticated Google/Supabase account is available to Admin Dashboard for customer management/support according to authorization rules.

## Architecture / Scale / Infrastructure

### [ACTIVE — 2026-08-11] Existing infrastructure with one explicitly approved Admin frontend project
Use the existing canonical GitHub repo, Render service, Supabase project, Backblaze B2 resources, Worker environment and SePay setup. The already-created `cws-admin` Vercel project is the only additional approved frontend resource. Do not create duplicate infrastructure without explicit Owner approval.

### [ACTIVE] Scale without manual operations
Normal architecture should support growth toward 100/1,000/1,000,000 Workers without manual per-machine/per-job database configuration, copied storage secrets, per-machine Founder/Admin approval, **per-batch Founder/Admin approval at already-approved sites**, manual Worker-ID entry, per-Worker ticket handling, or AI runtime intervention. This is a design constraint, not a claim those fleet sizes are deployed.

### [ACTIVE] Evidence levels
Keep `CODE VERIFIED`, `SIMULATION VERIFIED`, and `PRODUCTION RUNTIME VERIFIED` distinct. Builds, unit tests, deployment READY state, heartbeat or historical rows do not establish Golden Production E2E.

## Execution Governance

### [ACTIVE — 2026-08-11] CWS AI Engineering Harness is mandatory before code
`CWS_AI_ENGINEERING_HARNESS_V1.md` is the active AI-assisted engineering control framework for CWS.

Every coding agent enters through `AGENTS.md`, reads/applies the Harness before implementation, then loads active decisions/current spec and only task-relevant specialist protocols.

Binding governance rules:

- **code is the final execution phase, not the starting point**;
- material work passes grounding, diagnosis, decision-boundary, specification/planning/analyze gates before implementation;
- low-risk local fixes may use shortened L1 path but still require grounding, diagnosis, targeted verification and evidence;
- AI may choose implementation details inside an approved boundary but may not silently change product intent, workflow, architecture, security, infrastructure, payment/data rules, or other Founder-controlled boundaries;
- evidence level limits completion language;
- Harness complements Spec Kit/constitution, grounding/staleness policies and `CWS_AI_OPERATING_PLAYBOOK.md`.

### [ACTIVE] Mandatory diagnostic + Spec Kit funnel
Every material CWS change follows:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> Specify -> Clarify when needed -> Plan -> Tasks -> Analyze -> Implement -> Converge/Verify`

### [ACTIVE] Source-of-truth sync
Completed work updates `CURRENT_STATUS.md`, `CWS_ROADMAP.md`, relevant decisions/context/workflow/architecture docs and evidence. `CURRENT_STATUS.md` stays current-only; historical detail belongs under `reports/` and git history.
