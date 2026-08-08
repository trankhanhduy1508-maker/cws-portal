# CWS SYSTEM ARCHITECTURE V1

> Date: 2026-08-08
> Status: ACTIVE architecture baseline for the current MVP and the first stable 100-Worker fleet.
> Scope: architecture first; minimum infrastructure; strong security; no AI dependency in production runtime.
> Companion documents: `CWS_PRODUCTION_E2E_ROADMAP_V2_3.md`, `CWS_SCALABILITY_RULES.md`, `AGENTS.md`, `DECISIONS.md`.

---

# 1. PRIMARY TARGET

Build the smallest architecture that can operate approximately 100 physical Windows Workers reliably and securely without Founder or AI manually advancing normal jobs.

The current design target is **100 Workers**, not one million deployed Workers.

However, architecture boundaries must avoid obvious dead-ends. Future scale must be possible by replacing/scaling infrastructure behind stable contracts rather than redesigning Worker identity, Job/Task ownership, or storage security.

Rule:

**simple enough for MVP, secure enough for hostile Workers, stable enough for 100 Workers, boundaries clean enough to scale later.**

---

# 2. CANONICAL ARCHITECTURE

```text
Customer
   |
   v
CWS Portal
   |
   v
Backend API
   |
   +---------------------> Backblaze B2
   |                         ^
   v                         |
Supabase/Postgres            |
Jobs / Tasks / Workers       |
Leases / Progress            |
   |                         |
   v                         |
Authenticated Worker API ----+
   |
   v
Node Agent fleet
W001 ... W100
   |
   v
Blender
```

Core production concepts:

`Job -> Task -> Worker -> Lease -> Output`

Supporting concepts:

`priority + capability + heartbeat + retry + generation fencing`

Do not add Kafka, Kubernetes, service mesh, Redis cluster, NATS, MQTT, event sourcing, or extra microservices for the 100-Worker target unless measured evidence proves they are required.

---

# 3. CONTROL PLANE

The Backend API and durable database are the control plane.

Responsibilities:

- create Jobs/Tasks
- authenticate Workers
- expose claim/heartbeat/progress/completion APIs
- match Tasks to compatible Workers
- enforce priority and ownership
- maintain lease/generation state
- authorize storage access
- handle retry/failover
- maintain customer-facing job state

Workers must not independently mutate arbitrary production state.

For the current 100-Worker target, HTTPS Worker API + Supabase/Postgres is the default. A separate message broker is not required unless load testing proves otherwise.

---

# 4. WORKER MODEL

Each physical machine runs one canonical CWS Node Agent.

Node Agent lifecycle:

`START -> AUTHENTICATE -> IDLE -> CLAIM -> PREPARE -> RENDER -> UPLOAD -> CLEANUP -> IDLE`

Expected failure states must recover deterministically without AI.

Worker state should remain small and operationally useful. Recommended logical states:

- OFFLINE
- IDLE
- CLAIMING
- PREPARING
- RENDERING
- UPLOADING
- CLEANUP
- ERROR

OFFLINE is derived server-side from stale presence; Workers do not need to announce that they are offline.

A machine hostname, GPU model, IP address, or caller-supplied `worker_id` is not an identity proof.

---

# 5. WORKER IDENTITY AND ENROLLMENT

Security requirement:

**one compromised Worker must not compromise the fleet.**

Canonical requirements:

- one stable identity per Worker
- one revocable credential per Worker
- no global shared Worker secret
- Worker credential protected locally using the approved Windows mechanism such as DPAPI
- Backend validates every Worker request
- Worker can be disabled/revoked independently
- adding Worker N+1 uses the same bounded enrollment flow as Worker 1

Target enrollment contract:

`install/enroll -> authenticate/bootstrap -> stable identity + local protected credential -> preflight -> schedulable`

Normal fleet growth must not require Founder to manually edit database rows, create a B2 key, create infrastructure, or invoke AI for each Worker.

---

# 6. JOB / TASK / CLAIM MODEL

Do not build a complex DAG engine for the MVP.

Use:

- one Job as the customer render request
- one or more Tasks where splitting is clearly beneficial/safe

Initial decomposition policy:

- animation: may split into frame/range Tasks
- still image: one Task unless a proven renderer-safe partition exists
- unsupported/unsafe partitioning: one Task

Workers pull work through the authenticated claim path.

Canonical flow:

`IDLE Worker -> claim_next_task -> atomic claim/lease -> execute -> complete/fail`

Do not hard-push normal tasks directly to named machines.

---

# 7. LEASE, RETRY, FAILOVER, GENERATION FENCING

A claim grants a time-limited lease.

The active Worker renews presence/lease while executing.

If the Worker disappears or lease expires:

- Task becomes recoverable according to bounded retry policy
- a new Worker may claim it
- generation/fencing token changes
- stale Worker completion/progress from an old generation is rejected

Keep the existing generation-fencing direction where current implementation/runtime evidence supports it.

Retry must be bounded. Infinite automatic retry is forbidden.

Expected Worker crash/network loss must not require Founder or AI intervention.

---

# 8. HEARTBEAT / PRESENCE FOR 100 WORKERS

The 100-Worker target does not justify a separate presence platform.

Recommended initial cadence: approximately 15-30 seconds unless runtime measurements require otherwise.

At 100 Workers and 15-second cadence, control-plane heartbeat traffic is only about 6.7 requests/second before other Worker calls, which is suitable for the current simple architecture if implemented efficiently.

Store current presence, not every heartbeat as a permanent history row.

Minimum useful current state:

- worker_id
- state
- last_seen_at
- active_task_id if applicable
- current capability/version summary

Historical telemetry should be sampled at a much lower frequency if needed.

---

# 9. CAPABILITY MATCHING

Workers advertise operational capability such as:

- GPU model
- VRAM
- CPU/RAM
- OS
- Blender version
- renderer/device support

Tasks declare minimum requirements.

Scheduling/claim logic matches requirements deterministically.

The Founder/customer does not manually choose a physical machine for normal operation.

Do not build AI scheduling for MVP.

---

# 10. PRIORITY / QUEUE POLICY

Do not build multiple queue infrastructures for MVP.

A durable Task table with priority/scheduling fields is sufficient for the current target.

Conceptual tiers may map to numeric scheduling priority, e.g.:

- Priority
- Balanced
- Economy

Exact values are implementation details and must follow current product/pricing decisions.

Claim ordering should be deterministic and starvation-aware when implemented.

A single Job must not automatically consume all 100 Workers. Per-job concurrency limits may be added when task decomposition/concurrency actually exists.

---

# 11. STORAGE SECURITY BOUNDARY

This is a non-negotiable architecture boundary.

Forbidden canonical design:

`each Worker -> permanent B2 account/application credential`

Canonical design:

`authenticated Worker -> owns active Task lease -> Backend authorizes minimum task/job storage access -> Worker downloads/uploads -> access expires/revokes`

Requirements:

- long-lived B2/account credentials remain server-side
- no Supabase `service_role` on Worker
- no broad B2 credential on Worker
- no Founder-created B2 key per Worker
- Worker access is limited to the input/output objects required for the active Task
- authorization is short-lived and/or narrowly scoped and revocable
- Backend verifies Worker identity + current Task lease before granting storage access
- implementation must use capabilities that Backblaze B2 actually supports; do not invent unsupported signed-URL semantics

A backend-mediated transfer endpoint or supported temporary authorization mechanism is acceptable if it meets these properties and is simpler for MVP.

---

# 12. HOSTILE INPUT MODEL

Customer `.blend`, `.zip`, and related assets are untrusted input.

Security requirements include, where applicable:

- disable arbitrary Blender Python auto-execution for normal customer jobs
- prevent path traversal
- prevent extraction outside the job workspace
- bound archive expansion / archive-bomb risk
- prevent arbitrary overwrite of system/agent files
- use per-job isolated workspace directories
- validate paths and expected output locations
- cleanup job data after completion/failure according to retention policy

Never weaken this boundary merely to make Golden E2E pass.

---

# 13. WORKER PROCESS SECURITY

Principle of least privilege:

- Node Agent and Blender should run with the minimum Windows privileges required
- do not require Administrator for normal render execution unless proven necessary
- Worker must not receive backend/admin/database master credentials
- secrets must not be printed in logs, reports, UI, or git
- sensitive local credential material must use approved local protection and restrictive ACLs

If one Worker is fully compromised, the intended blast radius is:

- that Worker's identity/credential
- data/capability of Tasks legitimately granted to that Worker for the limited authorization window

It must not provide:

- other Worker credentials
- arbitrary unrelated customer files
- all B2 objects
- Supabase service-role access
- Admin API access
- fleet-wide control

Failure to meet this compromise test is an architecture defect.

---

# 14. WORKER UPDATE MODEL

Do not operate 100 machines by remote-updating each one manually.

Minimum scalable update boundary:

- Node Agent has current version
- canonical server/repository publishes desired release metadata
- update artifact has checksum and preferably cryptographic signature/authentic provenance
- Worker verifies artifact before execution
- update happens when safe/idle
- failed update does not silently leave the Worker trusted and schedulable in an unknown state

Do not build an enterprise rollout platform yet. Keep the interface compatible with unattended updates.

---

# 15. BACKEND / API SECURITY

All production APIs must use explicit authentication and authorization boundaries.

Required principles:

- deny by default
- authorize resource ownership, not only authentication
- validate Worker lease/generation on progress/completion/storage authorization
- idempotent completion/payment-sensitive transitions
- request/body/file-size limits where relevant
- input validation
- rate limiting or abuse controls on exposed endpoints as justified
- replay protection for signed Worker requests where current HMAC contract supports it
- audit security-sensitive actions
- no secrets returned to public/customer UI
- no reliance on obscurity of endpoint names

Admin remains separate from customer/Worker flows and must use strong authentication/MFA according to current ACTIVE decisions.

---

# 16. PRODUCTION AI INDEPENDENCE

AI tools may:

- write code
- review architecture
- analyze logs
- debug incidents
- run development/testing workflows

AI tools must not be required to:

- claim Tasks
- start renders
- approve state transitions
- upload normal outputs
- release payment/download
- revive a normal stalled workflow

If shutting down Codex/ChatGPT/Claude/Kimi causes the normal production render pipeline to stop, the architecture is not complete.

---

# 17. WHAT WE DO NOT BUILD YET

Unless evidence requires it, do not add:

- Kubernetes
- Kafka
- Redis Cluster
- NATS
- MQTT broker
- service mesh
- event sourcing
- multi-region control plane
- complex DAG scheduler
- AI scheduler
- large telemetry pipeline
- multiple scheduler microservices

These may become implementation options after measured bottlenecks appear. They are not MVP requirements.

---

# 18. 100-WORKER READINESS ACCEPTANCE

CWS is not considered 100-Worker-ready merely because 100 machines appear online.

Before claiming readiness, verify or load-test the following at appropriate scale:

1. 100 Workers can maintain heartbeat/presence without control-plane instability.
2. Concurrent claim attempts do not produce duplicate ownership.
3. Multiple Jobs can run concurrently.
4. Scheduler/claim respects capability and priority rules.
5. Several Workers may disappear mid-job and expired leases recover automatically.
6. Old generations cannot report completion after reassignment.
7. Worker reboot automatically reconnects/re-authenticates using the supported mechanism.
8. Backend restart does not lose durable Jobs/Tasks.
9. Temporary B2/storage failures use bounded retry/failure handling.
10. No AI or Founder command is required to advance normal Job states.
11. No fleet-wide/master storage/database secret exists on a Worker.
12. Revoking one Worker does not require rotating all Worker/storage credentials.
13. Adding Workers does not require manual B2 key creation per machine.
14. Customer-supplied render inputs remain inside the hostile-input security boundary.
15. Security tests include replay/authorization/ownership checks for Worker APIs.

Runtime evidence, not unit tests alone, is required for final PASS claims.

---

# 19. ARCHITECTURE CHANGE RULE

Before Codex/any agent changes a core production boundary involving Worker identity, scheduling, storage, task ownership, secrets, or state transitions, it must answer:

1. Does this remain simple for the current 100-Worker target?
2. Does this introduce manual work per Worker or per Job?
3. What secret/capability reaches the Worker?
4. What happens if that Worker is fully compromised?
5. Does it weaken Job/Task ownership, lease, or fencing guarantees?
6. Can the implementation later scale behind the same external contract without rewriting the Worker model?
7. Is new infrastructure justified by measured evidence, or is it over-engineering?

If security and simplicity conflict, do not silently weaken security. Escalate the concrete tradeoff to the Owner.

---

# 20. IMPLEMENTATION PRIORITY

Codex implementation order after reading current source of truth:

1. reconcile docs/code against this architecture
2. remove/replace per-Worker long-lived B2 credential dependency from the canonical path
3. preserve/verify secure Worker identity + authenticated gateway
4. verify deterministic heartbeat/claim/lease/generation behavior
5. complete one real autonomous claim -> download -> Blender -> upload -> completion
6. connect customer UI real flow
7. verify SePay sandbox/delivery
8. run AI-OFF Golden E2E
9. run targeted 100-Worker control-plane/concurrency/failure load simulations
10. add infrastructure only where evidence shows an actual bottleneck

Do not rewrite already-correct components merely to match naming in this document.

Current code/runtime evidence is authoritative for implementation details; this document defines the required architecture/security boundaries.
