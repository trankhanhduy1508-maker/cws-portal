# CWS Official Decisions — Active

> Reconciled 2026-08-12. This file contains current active decisions only. Superseded detail remains available in git history and `reports/`.

## Product / Roadmap

### [ACTIVE] One canonical roadmap
`CWS_ROADMAP.md` is the only active roadmap. Versioned roadmap files are historical and must not compete as source-of-truth instructions.

### [ACTIVE — 2026-08-12] Customer Google login is the first operational gate
Customer MVP begins with Google OAuth through Supabase Auth.

Unauthenticated visitors may see product/marketing content, but Upload/Drive is not operational until a valid customer session exists.

Customer and Admin/Host authentication remain separate.

## Customer Workflow / Input Security

### [ACTIVE — 2026-08-12] Normal Customer runtime requires zero Founder/Admin approval
After Google login, normal Customer execution is automatic. Founder/Admin does not approve input, Job creation, Worker assignment, state advancement, payment confirmation, or delivery.

Canonical front-of-flow:

`Google Login -> authenticated Upload/Google Drive -> temporary quarantine/staging -> pre-B2 anti-malware + security/structural validation -> CLEAN/SAFE -> canonical B2 input upload -> INPUT_SAFE -> auto-create exactly one customer-owned Job -> Scheduler/Tasks/Workers`

A supported authenticated New Render submission expresses render intent.

The previous active requirement:

`INPUT_READY -> customer presses Start render -> create Job`

is superseded. There is no mandatory post-validation `Start render` confirmation.

### [ACTIVE — 2026-08-12] Security scan happens before canonical B2 input upload
The previous B2-first quarantine/materialization direction is superseded.

All `.blend`, `.zip`, `.rar`, and approved Google Drive inputs are hostile/untrusted when they first arrive.

They must first enter a bounded **temporary quarantine/staging area outside canonical B2 input storage** using existing approved infrastructure.

Required pre-B2 layers include, as applicable:

- authenticated customer + server-side ownership;
- provider/URL validation and SSRF-aware outbound controls;
- bounded redirects/timeouts/size;
- extension allowlist;
- actual content/signature validation;
- anti-malware scan;
- ZIP/RAR traversal/bomb/resource/sandbox protections;
- Blender safety with untrusted Python autoexec disabled.

Verdict contract:

- `CLEAN + all required structural checks PASS -> upload/promote to canonical B2 -> verify object -> INPUT_SAFE`;
- `INFECTED/SUSPICIOUS -> QUARANTINE -> no canonical B2 upload -> no Job`;
- scanner unavailable/error/timeout/unknown -> fail closed -> remain quarantined -> no canonical B2 upload -> no Job;
- malformed/unsupported/unsafe input -> quarantine/reject according to policy -> no canonical B2 upload -> no Job.

Frontend state is never authoritative for CLEAN or `INPUT_SAFE`.

### [ACTIVE — 2026-08-12] Malware handling is quarantine-first; use mature existing security tooling instead of building an antivirus engine
CWS must integrate a mature, maintained security scanner/endpoint-protection tool rather than implement antivirus detection/remediation logic from scratch.

Implementation order is **integration-first**:

1. inspect existing CWS security patterns/integrations;
2. evaluate established maintained tools/plugins/packages from authoritative upstream sources;
3. verify current maintenance, security advisories, license, provenance/signatures/hashes where available, and compatibility with existing CWS infrastructure;
4. integrate the smallest safe supported interface;
5. add CWS-specific orchestration, audit, policy and tests around the tool instead of recreating the scanning engine.

Detection response:

- suspicious/infected customer input is **quarantined first** and is not promoted to canonical B2 or rendered;
- quarantine is containment, not automatic deletion;
- a detected file is not automatically modified and then trusted merely because a scanner offers a repair action;
- if there is evidence or strong indication that malware has executed, escaped quarantine, modified the host, or is actively intruding into CWS infrastructure, trigger the approved security product's containment/remediation/eradication capability and incident workflow;
- system remediation may isolate/remove malicious artifacts/processes according to the trusted tool's supported behavior and CWS policy;
- do not write a custom virus-removal engine;
- do not weaken quarantine or security gates to keep a Job running.

Any attempt to disinfect/repair the **customer project itself** and then continue rendering must be separately validated as format-preserving and safe. If that cannot be proven, keep the submission quarantined and require a clean resubmission rather than risk corrupting customer work.

Do not upload private customer project files to public VirusTotal-style scanning services without a separate Founder decision.

Malware CLEAN does not replace signature validation, archive safety, sandboxing, or Blender execution controls.

### [ACTIVE] Canonical B2 input is trusted-by-validation
Canonical B2 input storage is not the first landing zone for untrusted customer files.

After all mandatory pre-B2 checks pass:

`temporary quarantine -> CLEAN/SAFE -> canonical B2 upload -> integrity/ownership verification -> INPUT_SAFE`

Google Drive is an ingestion source, not a Worker dependency. Worker never needs the customer Drive URL/API key after canonical B2 materialization.

Do not create a new B2 bucket or new storage service merely for quarantine without Founder approval.

### [ACTIVE] Supported public customer input
MVP supports:

- `.blend`
- `.zip`
- `.rar`
- approved Google Drive file links

OneDrive, Dropbox and arbitrary direct-link ingestion are not public canonical inputs without a new Founder decision.

### [ACTIVE] Archive safety
ZIP/RAR handling occurs only in bounded sandboxed processing with traversal/sandbox-escape/bomb/resource protections and deterministic `.blend` selection. Required structural checks happen before canonical B2 promotion.

### [ACTIVE] Immutable original + safe Blender preparation
After clean canonicalization, the customer original in B2 remains immutable.

Canonical preparation:

`immutable canonical B2 original -> safe/read-only analysis -> working copy -> deterministic safe optimization -> post-opt validation -> render`

Untrusted Blender Python autoexec remains OFF. Automatic optimization may not silently change customer visual/animation semantics.

## Customer Job / Scheduler

### [ACTIVE — 2026-08-12] Automatic exactly-one Job creation
Only authoritative `INPUT_SAFE` may create a production Job.

Backend automatically creates exactly one customer-owned Job for the accepted New Render submission intent.

Requirements:

- server-side customer ownership;
- canonical B2 input already exists and is verified;
- idempotency under retries/refresh/callback duplication;
- Customer A cannot use Customer B input;
- temporary quarantined/rejected/unknown-scan input cannot create a Job;
- no Founder/Admin approval;
- no mandatory customer Start Render click after validation.

### [ACTIVE] Customer render speed/tier feature is removed
Customer does not choose render tier, Worker count, GPU, CPU or hardware. Active UI/API/domain/persistence must not require a tier identifier.

### [ACTIVE] CWS Adaptive Deadline Scheduler
CWS uses a work-conserving deadline scheduler on the existing PostgreSQL durable Task model.

Canonical behavior:

1. Analyze authoritative project/work range and create durable non-overlapping Tasks.
2. Start useful production work immediately; no benchmark-only blocking phase.
3. Initial desired capacity is 10 eligible Workers when runnable work and fleet capacity permit.
4. Completed real Tasks/frames provide runtime evidence.
5. Project final completion against the internal <=45-minute target including finalization reserve.
6. Increase desired capacity if completion is at risk.
7. Use configurable 20–30% safety capacity and round Worker count upward to an integer.

### [ACTIVE] No concurrent duplicate frame ownership
One Task/frame has one active authoritative Worker at a time.

Atomic claim + lease + generation fencing remains authoritative. Failed/expired work is reassigned only after old ownership is no longer authoritative and generation advances.

### [ACTIVE] 45-minute budget includes finalization
The internal <=45-minute target includes required preparation, render, retries/stragglers, output collection/validation and animation assembly/encode/finalization.

Distributed tile/sample rendering of one single slow frame is not current MVP scope.

## Output / Pricing / Payment

### [ACTIVE] Render-before-payment; no customer preview approval gate
Canonical order:

`real render/finalize -> validate -> full B2 output LOCKED -> 3–5 real CWS-watermarked previews -> final price + unique payment reference/content + MB QR -> SePay exact verification -> PAID -> authorized download`

There is no customer preview-approval action required before payment.

Do not rerender/repackage/reupload an already-completed output merely because payment completed.

### [ACTIVE] Pricing multiplier
Final customer price uses the approved **2.5x multiplier** over verified runtime/cost basis. Do not invent a new hard-coded base rate without Founder approval.

### [ACTIVE] Payment method
MVP uses Vietnam bank QR + SePay webhook. No MoMo/PayPal.

Webhook processing is authenticated, idempotent and fail-closed. Exact payment reference/content and exact amount must match before `PAID`/unlock.

### [ACTIVE] Output locking
Full validated output is stored in B2 and LOCKED before payment. After `PAID`, Backend issues a narrow authorized download capability.

## Worker / Provisioning / Security

### [ACTIVE] Production runtime must work without AI/Admin
Normal scheduling, Worker claim/heartbeat, render, retries, storage, payment matching, delivery, cleanup and recovery cannot require ChatGPT/Codex/Founder/Admin intervention.

### [ACTIVE — 2026-08-12] One physical PC = one canonical PCID/Worker ID
`PCID` and `Worker ID` are aliases of the same canonical `worker_id`; there is no second independent PC-ID namespace.

Backend generates the canonical ID during first provisioning using 128 bits of cryptographically secure random entropy, preferably:

`cwsw_<32 lowercase hex>`

Database PRIMARY KEY/UNIQUE enforcement is authoritative. Collision -> reject -> fresh random ID -> bounded/idempotent retry; never overwrite/merge machines.

Worker ID is opaque and is not derived from hostname, site, GPU, MachineGuid, serial, fingerprint, customer, Job, or sequential count.

Machine fingerprint is security evidence only, not a second identity.

### [ACTIVE — 2026-08-12] Worker provisioning has no per-machine or per-batch Founder operation
Founder/Admin must not:

- type Worker IDs;
- create Worker rows manually;
- issue/copy one enrollment ticket per normal Worker;
- approve each normal PC;
- approve each normal new batch at an already-approved site;
- perform enrollment per customer Job.

Internal one-time ticket material may remain as an automated bounded security primitive.

### [ACTIVE — 2026-08-12] Approved site/fleet autonomy
Site/fleet trust is approved once through a privileged authenticated boundary and becomes durable server-side trust.

Canonical direction:

`site approved once -> durable site trust -> autonomous site-controller capability renewal -> unattended PC bootstrap -> fingerprint evidence -> Backend-generated Worker ID -> bounded enrollment material -> per-Worker credential -> DPAPI -> Node Agent -> heartbeat -> ACTIVE_IDLE`

Short-lived provisioning token expiry is not site approval expiry. While site trust remains APPROVED and policy permits, capability renewal/exchange must be automatic without Founder/Admin AAL2 per batch.

Site controller capability is provisioning-only, site-scoped, revocable/auditable, and is not a Worker credential, Supabase service-role, payment authority or B2 master authority.

Founder/Admin interaction after initial approval is reserved for exceptional trust/security events such as suspension/revocation recovery, ownership change, explicit trust reset or root credential rotation.

### [ACTIVE] Partner Golden Image model
Approved partner runtime may be baked into Windows/BootROM Golden Image:

- bootstrap/startup wrapper;
- Node Agent;
- Worker Engine;
- Blender/runtime dependencies;
- non-secret site configuration.

Golden Image must not contain shared Worker credential, Supabase service-role, B2 master credential, or site-controller root/trust secret.

Each physical PC retains its own identity/credential in supported per-machine persistent state.

### [ACTIVE] Canonical Windows lifecycle
Node Agent is the single resident production supervisor.

`Windows boot -> Node Agent service -> authenticated heartbeat -> ACTIVE_IDLE -> claim -> launch task-scoped Worker Engine -> Blender/render/upload/verify -> Worker Engine exits -> cleanup -> ACTIVE_IDLE`

Worker Engine is not a second permanent service. Duplicate Node Agent startup paths are forbidden.

### [ACTIVE] Worker gateway / storage boundary
Workers use the authenticated Backend gateway and never receive Supabase service-role credentials.

Long-lived B2/account credentials remain server-side. Workers receive only narrow task/object-scoped storage capabilities.

### [ACTIVE] Scheduler boundary
Keep PostgreSQL durable queue + atomic claim + lease + generation fencing. No Redis/NATS/Kafka/RabbitMQ/new control-plane service without measured evidence and Founder approval.

## Admin / Staff

### [ACTIVE] Separate Admin frontend
Customer frontend: `cws-portal.vercel.app`.

Admin frontend: `cws-admin.vercel.app`.

Both use the same canonical repo/backend/Supabase/B2/SePay business-data sources. The split does not authorize duplicate infrastructure.

### [ACTIVE] Admin authentication
Admin/Host use Google OAuth through Supabase plus required TOTP/AAL2 and explicit staff role authorization.

Admin AAL2 protects privileged Admin/staff actions. It is not a mandatory step in normal Customer execution, normal Worker lifecycle/provisioning, or each normal new batch at an already-approved site.

### [ACTIVE] Customer CRM
Authenticated customer profile/account information may be available in Admin Dashboard for authorized support/management purposes.

## Architecture / Scale / Infrastructure

### [ACTIVE] Existing infrastructure only unless approved
Use the canonical repo, existing Render service, production Supabase, B2 resources, SePay setup, Customer Vercel project and explicitly approved `cws-admin` Vercel project.

Do not create duplicate/new production infrastructure without Founder approval.

### [ACTIVE] Scale without linear manual operations
Architecture should remain logically viable toward 100/1,000/10,000/1,000,000 Workers without per-machine/per-job/per-batch Founder operations, copied master secrets, manual Worker-ID entry, manual ticket handling or AI runtime dependence.

This is a design constraint, not a claim those fleet sizes are deployed.

### [ACTIVE] Evidence levels
Keep distinct:

- `CODE VERIFIED`
- `SIMULATION/INTEGRATION VERIFIED`
- `PRODUCTION RUNTIME VERIFIED`
- `GOLDEN PRODUCTION E2E VERIFIED`

Builds/tests/deploy READY/heartbeat/history alone do not prove Golden E2E.

## Execution Governance

### [ACTIVE] CWS AI Engineering Harness + Spec Kit are mandatory
Material changes follow:

`Reality -> Diagnosis -> Root Cause -> One Current Bottleneck -> Constitution -> Specify -> Clarify when needed -> Plan -> Tasks -> Analyze -> Implement -> Verify/Converge -> Learn`

Code is the final execution phase, not the starting point.

AI may choose implementation details inside an approved boundary but may not silently change product workflow, architecture, security, infrastructure, payment/data rules or other Founder-controlled decisions.

### [ACTIVE] Source-of-truth sync
Completed material work updates the relevant canonical current status, decisions, workflow/spec, roadmap/architecture and engineering learning evidence.

`CURRENT_STATUS.md` remains current-only. Historical evidence belongs under `reports/` and git history.
