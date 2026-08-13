# CWS Security Architecture V1.1 — Render-Farm Hardened

> Status: Founder-directed hardening layer over `CWS_SECURITY_ARCHITECTURE_V1.md`.  
> Date: 2026-08-13.  
> Purpose: apply security patterns learned from mature render farms and cloud-render systems to CWS without copying their infrastructure blindly.  
> Scope: partner-host trust, job/data isolation, temporary capabilities, worker posture, cleanup, audit, confidentiality, ingress scanning and large-file handling.  
> Authority: latest Founder decisions + runtime evidence + `DECISIONS.md` + canonical workflow + Harness/Spec Kit remain authoritative.

## 1. What was learned from mature render systems

CWS should not treat antivirus as the security architecture. Mature render/cloud-render systems rely on **multiple security boundaries** around data, credentials, workers and job execution.

The most relevant patterns are:

### AWS Deadline Cloud patterns to adopt

- Farm/queue/fleet boundaries are security boundaries, not only scheduling constructs.
- Jobs should execute under least-privileged OS identities rather than the supervisor/agent identity.
- Workers/jobs should receive **temporary, narrow credentials**, not long-lived storage or control-plane credentials.
- Shared storage/prefixes must not cross security boundaries without deliberate authorization.
- Jobs may leave temporary files or processes behind; cleanup and process termination are part of security, not housekeeping.
- Worker agent files/configuration must not be writable by untrusted job users/processes.
- Host networking, DNS and routing configuration are protected assets.
- Worker software and OS must be patched and trusted software provenance should be verified.

### GarageFarm / Fox / RebusFarm patterns to adopt

- Encrypt transfers in transit.
- Customer A must not be able to access Customer B data.
- Project confidentiality is a first-class security objective, not only malware prevention.
- Security programs include periodic vulnerability assessment/penetration testing and controlled access to production infrastructure.
- Sensitive-project operations should support NDA/enterprise controls later without changing core runtime semantics.
- Data lifecycle and deletion/retention rules must be explicit.

### iRender / dedicated-environment lesson to adapt

CWS cannot copy a single-tenant dedicated-server model because CWS intentionally uses distributed partner PCs. However, CWS should emulate **single-job visibility**:

`one Worker task -> only the input objects and output prefix required by that task`

A partner PC must never receive broad visibility into customer storage, unrelated Jobs or master credentials.

## 2. CWS-specific threat model: the Host is not fully trusted

Traditional render farms usually control their datacenter hardware. CWS does not. Partner PCs may be physically controlled by cybercafe owners, office operators or other hosts.

Therefore V1.1 adds a binding assumption:

> **The partner Host/PC is a separate trust boundary and is not trusted with customer project confidentiality beyond the minimum data required for the currently authorized task.**

CWS must protect both directions:

### Customer -> CWS / Host threats

- malware;
- malicious `.blend` content;
- scripts/plugins;
- archive traversal/bombs;
- SSRF/resource abuse;
- malformed files;
- attempts to escape task boundaries.

### Host / Worker -> Customer threats

- Host operator reading customer assets;
- compromised Worker stealing project files;
- one Worker reading another Job/customer;
- persistence after task completion;
- credential/token reuse;
- copied temporary files;
- leftover render subprocesses observing later tasks.

Both directions must be addressed before CWS can claim strong production security.

## 3. Per-task data capability — mandatory direction

Workers must never receive B2 master credentials or account-wide storage authority.

For each authoritative task, Backend issues or mediates a **short-lived, task-scoped data capability** limited to the minimum required operations.

Conceptual contract:

`Task T -> read exactly approved canonical input object(s) -> write exactly approved output prefix/object(s) -> expires/revokes after task terminal state`

Required properties:

- tied to authoritative Worker/task assignment;
- bounded TTL;
- object/prefix scoped;
- least privilege (`read input`, `write output`, no arbitrary list/delete unless explicitly required);
- generation/lease aware where applicable;
- cannot be reused to access another customer or task;
- not persisted in Golden Image;
- not logged in plaintext;
- revoked/invalidated or naturally expired after task completion/failure.

This is the CWS equivalent of temporary queue/job credentials used by mature cloud render systems.

## 4. Worker execution identity separation

Node Agent remains the resident supervisor. Worker Engine remains task-scoped.

V1.1 direction:

- supervisor identity and task execution identity should be separated where practical;
- task process must not be able to modify Node Agent binaries/configuration/credential storage;
- Blender/child processes receive only task-scoped access;
- untrusted content must not run with administrative/SYSTEM privileges merely because Node Agent is privileged;
- Windows Task Scheduler/autorun/persistence creation by the render task should be denied or monitored where feasible;
- job process tree must be terminated at task completion/failure before returning to `ACTIVE_IDLE`.

Any design that runs customer-controlled workload with Node Agent's full resident privileges requires explicit security review before production approval.

## 5. Worker security posture / eligibility

CWS should not assume every enrolled PC has identical security posture.

Introduce a **policy concept** (not necessarily new schema in this document) for Worker security eligibility, for example:

- `TRUSTED`
- `STANDARD`
- `RESTRICTED`
- `QUARANTINED`

This is an internal scheduling/security attribute, not a customer-facing tier.

Possible evidence inputs:

- Worker credential valid;
- expected Node Agent version;
- Defender/endpoint protection active where required;
- recent heartbeat;
- no active containment flag;
- supported OS/patch baseline;
- no unresolved security incident;
- storage/workspace cleanup verification.

Rules:

- `QUARANTINED` Worker receives no new customer tasks;
- security posture cannot override lease/generation fencing;
- posture is evidence/policy, not a second Worker identity;
- no manual per-job Founder approval is introduced.

Implementation requires grounding against existing Worker schema before adding fields.

## 6. Customer confidentiality / data isolation

CWS security success includes keeping customer intellectual property confidential.

Mandatory direction:

- Customer A cannot enumerate/read Customer B canonical inputs or outputs;
- Worker receives only currently authorized task data;
- Host should not retain reusable credentials enabling later downloads;
- Backend service credentials remain server-side;
- temporary working files are removed after task terminal state;
- logs must not contain full secrets or unnecessary customer content;
- support/admin access to customer projects should be least-privilege and auditable;
- customer originals remain immutable once canonicalized.

Later enterprise features may add retention controls, NDA workflows, enhanced encryption/key isolation or higher-assurance Worker pools, but these require separate Founder decisions.

## 7. Post-job hygiene is a security gate

Before a Worker returns to `ACTIVE_IDLE`, CWS should verify a cleanup sequence such as:

1. render/upload result finalized or task terminal failure recorded;
2. Worker Engine stops accepting work for that task;
3. terminate Blender and all known child processes for the task;
4. remove task-scoped temporary files/workspace according to policy;
5. clear task-scoped environment variables/tokens from process lifetime;
6. expire/revoke task data capability;
7. ensure no task-owned process is still running;
8. record cleanup evidence;
9. only then return Node Agent to `ACTIVE_IDLE`.

Cleanup failure is not silently ignored. Worker should enter a non-runnable/containment state until recovery policy succeeds.

This directly addresses mature render-farm warnings that job processes/data can remain on reused workers.

## 8. Endpoint protection role

For Windows partner PCs, Microsoft Defender / approved endpoint protection is the preferred defense-in-depth baseline because the Worker is Windows-native.

Role split:

### Ingress scanner

Purpose: block known/suspicious hostile input before canonical B2/`INPUT_SAFE`.

Current MVP candidate: ClamAV or another mature maintained engine after runtime capacity verification.

### Windows endpoint protection

Purpose: detect/block/remediate behavior or artifacts on the actual Worker host if something escapes upstream scanning.

Microsoft Defender is preferred for the existing Windows Worker baseline because it is native to Windows and provides host/runtime protection. It does **not** replace quarantine-before-B2 scanning.

Future commercial EDR (e.g. Defender for Endpoint, CrowdStrike, SentinelOne) may be evaluated when CWS has enterprise/customer requirements and budget; V1.1 does not authorize new paid security infrastructure.

## 9. Security Tool Matrix

| Threat / layer | MVP tool/direction | Role | Not sufficient alone |
|---|---|---|---|
| File malware before B2 | ClamAV candidate, capacity-gated | quarantine verdict | does not prove Blender execution safe |
| Windows Worker endpoint | Microsoft Defender | runtime/host defense | does not replace ingress scanning |
| Dependency/container/code | existing Trivy/Semgrep patterns where applicable | supply-chain/code findings | does not validate customer files |
| Archive safety | bounded ZIP/RAR parser/tool | traversal/bomb/resource controls | does not replace malware scan |
| Blender script risk | `--disable-autoexec` / equivalent enforced path | prevents untrusted Python autoexec | does not sandbox every native/plugin vulnerability |
| Storage authorization | Backend-issued task/object-scoped capability | least-privilege data access | does not replace Worker identity/fencing |
| Worker ownership | credential + lease + generation fencing | authoritative task ownership | does not prove host integrity |
| Host compromise response | Defender/approved endpoint containment + CWS Worker quarantine state | contain/recover | not a substitute for clean rebuild where required |

## 10. Large-file security: learn the pattern, not a vendor limit

Commercial render farms are designed around large project transfer/storage. CWS must not turn a constrained web-service scanner limit into a permanent product limit.

V1.1 requirements:

- streaming ingress instead of whole-file RAM buffering;
- bounded temporary disk/quarantine;
- checksum/hash for integrity and idempotency evidence;
- raw object malware scan before canonical promotion;
- archive metadata/structural validation before expensive extraction;
- bounded extraction only after policy permits;
- extracted members remain untrusted until required checks pass;
- scan concurrency begins at 1 on unknown/constrained capacity;
- scanner/runtime limits are internal operational bounds;
- public supported-size changes require Founder approval.

If existing Render capacity cannot safely scan supported workloads, stop and present measured evidence. Do not silently lower customer capability or create new infrastructure.

## 11. Network boundary on Workers

Where technically practical without breaking required render behavior:

- Worker/Blender should not have arbitrary access to CWS control-plane secrets;
- restrict access to local credential stores owned by Node Agent;
- avoid exposing Supabase management/service-role endpoints to task processes;
- task network access should be only what the renderer genuinely requires;
- DNS/hosts/routing configuration is protected from task modification;
- unexpected outbound access from untrusted project content is a security signal.

A strict outbound allowlist may break legitimate asset/plugin workflows and therefore requires measured compatibility and Founder approval before becoming a production requirement.

## 12. Software provenance / patching

Apply the mature-render-system lesson that worker software itself is part of the security boundary:

- Node Agent/Worker Engine binaries/config are writable only by trusted installer/update path;
- verify release provenance/signatures/hashes where supported;
- Blender/runtime/plugin versions are inventoried;
- security updates are applied through controlled rollout;
- Golden Image must not embed master secrets;
- untrusted job content must not overwrite shared application/agent binaries.

## 13. Security testing program

CWS should evolve toward routine controls seen in mature farms:

- automated dependency/code security scanning;
- auth/ownership negative tests;
- archive traversal/decompression-bomb tests;
- scanner unavailable/error/timeout tests;
- task capability cross-customer denial tests;
- post-job process/workspace cleanup tests;
- periodic vulnerability assessment/penetration testing as CWS approaches commercial/enterprise scale;
- incident/recovery exercises for a compromised Worker.

This does not require enterprise certification for MVP. ISO 27001/TPN are future organizational targets, not current claims.

## 14. Data lifecycle / retention direction

Every temporary customer artifact needs an explicit terminal-state lifecycle:

- quarantine object;
- extracted workspace;
- Worker task workspace;
- canonical input;
- output;
- logs/evidence.

V1.1 requires policy-driven cleanup and auditable retention rather than indefinite leftovers.

Future cryptographic-erasure/per-project-key designs may further protect sensitive customers, but they cross storage/key architecture boundaries and require Founder approval before implementation.

## 15. What CWS deliberately does NOT copy

CWS does not blindly copy vendor infrastructure:

- no dedicated VM/server per customer in MVP;
- no AWS IAM/S3 migration merely to imitate Deadline Cloud;
- no new storage bucket/service/control plane without evidence and Founder approval;
- no customer-facing hardware/security tier unless explicitly approved;
- no claim of ISO 27001/TPN certification;
- no reliance on NDA as a technical security control;
- no assumption that antivirus CLEAN equals safe-to-render.

CWS adopts **principles**, not vendor topology.

## 16. Updated canonical security sequence

```text
CUSTOMER
  -> Google OAuth
  -> server-side ownership
  -> TEMP QUARANTINE
  -> provider/SSRF + size/time bounds
  -> signature/content validation
  -> malware scan
  -> archive structural/resource validation
  -> Blender safety checks
  -> CLEAN/SAFE
  -> CANONICAL B2 + integrity verification
  -> INPUT_SAFE
  -> exactly-one Job
  -> durable Tasks
  -> scheduler selects security-eligible Worker
  -> lease/generation ownership
  -> short-lived task/object-scoped data capability
  -> Node Agent launches task-scoped Worker Engine
  -> Blender autoexec OFF
  -> Defender/endpoint defense-in-depth
  -> render/upload/verify
  -> terminate task process tree
  -> cleanup task workspace
  -> expire/revoke task capability
  -> cleanup evidence
  -> ACTIVE_IDLE
```

## 17. V1.1 implementation priority

### P0 — before next real Customer-to-Worker security claim

- quarantine-before-canonical-B2;
- mature malware scanner integration fail-closed;
- archive structural/resource protections;
- authoritative `INPUT_SAFE`;
- exactly-one Job idempotency;
- Blender autoexec OFF verified in real Worker invocation;
- no Worker master storage/service credentials;
- task/object-scoped data access design grounded against current B2/backend implementation;
- cleanup/process-tree termination verified for one Worker.

### P1 — before multi-Worker expansion

- Worker security eligibility/containment state;
- Defender/endpoint protection baseline verification;
- cross-customer/task capability negative tests;
- cleanup failure prevents return to runnable state;
- Worker agent binaries/config protected from task modification;
- patch/version inventory.

### P2 — before enterprise-sensitive workloads

- enhanced Worker isolation/sandboxing based on measured threats;
- stronger egress/network controls where compatible;
- enhanced retention/key isolation;
- formal vulnerability/penetration testing cadence;
- enterprise compliance/TPN/ISO planning if commercially justified.

## 18. Founder approval boundaries introduced/clarified by V1.1

The following are **not automatically authorized** by this document:

- a new scanning service;
- a new quarantine bucket/storage provider;
- dedicated VM/container-per-job infrastructure;
- paid EDR/XDR platform;
- customer-facing security tiers;
- changes to public upload-size support;
- strict outbound network policy that may break render workloads;
- project-specific encryption-key architecture;
- execution of customer Python/add-ons.

Codex must present evidence and request Founder approval before crossing any of these boundaries.

## 19. Research basis

This hardening layer adapts patterns from publicly documented mature systems, including:

- AWS Deadline Cloud security best practices: least-privilege job users, fleet/queue security boundaries, temporary credentials, storage-prefix isolation, host hardening, cleanup concerns and software verification;
- GarageFarm.NET: encrypted transfer, per-customer data isolation, controlled infrastructure access, periodic penetration/vulnerability testing;
- Fox Renderfarm: ISO 27001/TPN-oriented content-security posture, encrypted transfer and data-isolation claims;
- RebusFarm: ISO 27001/NDA-oriented customer data security posture;
- iRender: dedicated-environment/data-isolation model used as a lesson for minimizing cross-job visibility.

Vendor marketing/certification claims are not treated as proof that CWS has equivalent controls. CWS must verify its own implementation and runtime evidence.

## 20. V1.1 success criterion

CWS Security Architecture V1.1 is implemented only when:

- hostile customer input fails closed before canonical trust;
- safe input alone reaches `INPUT_SAFE`;
- exactly one authorized Job is created;
- Worker sees only data required for its authoritative task;
- partner Host is not trusted with broad customer/storage authority;
- Blender runs without untrusted Python autoexec;
- endpoint protection provides defense-in-depth;
- stale processes/data/capabilities are cleaned before Worker reuse;
- cross-customer/task access is denied;
- material security decisions are auditable;
- production still operates with Founder/Admin/AI offline.
