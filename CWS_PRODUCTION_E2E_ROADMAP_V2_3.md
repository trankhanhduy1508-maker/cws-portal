# CWS PRODUCTION E2E ROADMAP V2.3

> Date: 2026-08-08
> Status: ACTIVE — supersedes `CWS_PRODUCTION_E2E_ROADMAP_V2_2.md` for Production E2E execution.
> Purpose: Complete one real production Golden E2E while preserving architecture boundaries that can grow from the first Worker to large fleets without per-machine manual operations.
> Mandatory companion rule: `CWS_SCALABILITY_RULES.md`.

---

# 0. NON-NEGOTIABLE DECISIONS

## 0.1 Production runtime must be AI-independent

Canonical path:

`Customer UI -> Backend/Supabase -> durable Job/Task -> Scheduler/Claim -> Worker -> Blender -> Storage -> progress/state -> review -> payment -> delivery`

ChatGPT, Codex, Claude, Kimi, or any other AI may build/debug/test the system but must never be required to operate a normal production job.

If a job stalls until AI or Founder manually advances a normal runtime transition, Golden E2E is NOT PASS.

## 0.2 Scale-by-design is mandatory

Every production design must be checked against approximately:

- 100 Workers
- 1,000 Workers
- 1,000,000 Workers

This is an architecture test, not a requirement to deploy one million machines now.

Do not over-engineer infrastructure for future scale. Do reject designs that create obvious linear manual operations or secret-distribution bottlenecks.

Target rule:

**minimum implementation now, scalable boundary by design.**

## 0.3 No per-Worker manually created B2 application key as canonical design

The previous V2.2 path that treated a scoped B2 application key on each Worker as the normal runtime contract is superseded.

Canonical long-term storage boundary:

`Worker identity -> authenticated Backend -> claim Job -> Backend grants minimum job-scoped storage capability -> Worker downloads/renders/uploads -> capability expires/revokes`

Requirements:

- long-lived B2/account-level credential remains server-side in trusted infrastructure
- Worker does not receive Supabase `service_role`
- Worker does not receive broad B2 account credentials
- Founder must not create/copy a B2 application key manually for every Worker
- compromise of one Worker must not expose unrelated jobs or fleet-wide storage access
- storage authorization should be short-lived and/or narrowly job/object scoped and revocable
- exact mechanism must use supported Backblaze B2 APIs; verify capabilities before implementation and do not invent unsupported signed-URL behavior

A temporary scoped B2 key on MAY083 is allowed only as an explicitly documented emergency bootstrap experiment if no safer supported route can be implemented in reasonable MVP time. It must never be marked as the final fleet provisioning architecture.

## 0.4 Operator effort must not grow linearly with fleet size

Adding Worker N+1 should follow the same bounded flow regardless of fleet size:

`install/enroll -> authenticate -> receive stable identity/config -> preflight -> schedulable`

Normal Worker addition must not require Founder to:

- create a new B2 key
- edit DB rows manually
- create a Vercel/Supabase/B2/Render project/resource
- copy account-level secrets onto the machine
- invoke Codex/AI to finish enrollment

## 0.5 Existing security boundaries remain

Keep unless runtime evidence proves a specific change is required:

- authenticated Backend Worker gateway
- per-Worker identity/credential
- HMAC-signed Worker RPC
- DPAPI-protected Worker identity credential on Windows
- generation fencing/resilient claim flow
- dynamic JobSpec
- generic Worker Engine

Do not:

- put Supabase `service_role` on Worker
- use one shared global Worker secret
- reintroduce legacy worker architecture as canonical production path
- create duplicate infrastructure
- add Redis/NATS/MQTT/microservices before measured need

---

# 1. REQUIRED READING ORDER FOR CODEX

Before modifying production E2E, read:

1. `CURRENT_STATUS.md`
2. `CWS_ROADMAP_MVP_V1.md`
3. `DECISIONS.md`
4. `AGENTS.md`
5. `CODEX_CONSTITUTION.md`
6. `CODEX_GLOBAL_RULES.md`
7. `CWS_SCALABILITY_RULES.md`
8. this file
9. current Worker/backend/storage code, tests, production evidence, and the latest P0/P1 evidence reports

Current code/config/runtime evidence wins over stale historical docs. Reconcile conflicts before marking work DONE.

---

# P0 — PRODUCTION REALITY CHECK

**Status: DONE — 2026-08-08.**

Retain the verified production schema/RPC findings from V2.2 and its evidence report. Do not blindly reapply migrations.

---

# P1 — SCALABLE WORKER ENROLLMENT + STORAGE AUTHORIZATION

## Goal

Make the first physical Worker usable without creating a fleet design that requires manual B2 secret provisioning per machine.

## P1A — Worker identity

MAY083 may continue using the already-provisioned stable per-Worker identity/HMAC/DPAPI model if verified current runtime evidence supports it.

The enrollment design must remain automatable for later Workers.

### Implementation status — 2026-08-08

- **CODE/UNIT + PRODUCTION SCHEMA VERIFIED**: migration 026 and Backend expose
  an Admin AAL2 batch issuer (1–100 per request) plus one-time Worker redeem.
  Tickets are short-lived and Worker-ID-bound; final credentials are generated
  locally and DPAPI-protected. No manual database row edit or fleet-wide
  enrollment secret is required.
- **NEEDS PHYSICAL VERIFICATION**: a second physical Worker has not redeemed a
  real ticket. Existing MAY083 identity remains valid and unchanged.

## P1B — Replace per-Worker B2 secret dependency

Codex must inspect the current Worker/backend B2 implementation and Backblaze B2 capabilities, then implement the smallest safe architecture where long-lived storage credentials stay server-side and the Worker receives only job-scoped/minimum storage access.

Acceptable implementation families include, only if supported and verified:

- Backend-generated temporary B2 authorization scoped to required bucket/prefix/object set
- backend-mediated upload/download endpoints
- temporary/job-scoped authorization using supported B2 APIs
- another least-privilege server-mediated capability with equivalent security properties

Do not choose a mechanism based on assumption. Verify B2 API behavior first.

## P1 PASS

- MAY083 Worker identity works
- no Supabase service-role on Worker
- no account-wide B2 credential on Worker
- normal Worker provisioning does not require Founder-created B2 key per machine
- Worker can obtain required input/output storage capability automatically after authenticated claim
- secrets are never printed or committed
- preflight passes with real runtime evidence

### Implementation status — 2026-08-08

- **CODE/UNIT VERIFIED**: Backend issues 120-second exact-object B2
  S3-compatible presigned GET/PUT capabilities after authenticated Worker and
  current-generation claim verification. Canonical Node Agent consumes these
  capabilities with bounded streaming and no B2 credential.
- **NEEDS RUNTIME VERIFICATION**: deploy Backend and prove real claimed-task B2
  transfer before marking P1 PASS.
- Evidence: `reports/security/CWS_JOB_SCOPED_B2_CAPABILITY_2026-08-08.md`.
- **PRODUCTION SCHEMA VERIFIED**: customer upload keys are now bound to the
  authenticated Supabase user; create-job rejects a key owned by another
  customer. The internal ownership table is service-role-only.

---

# P2 — AUTONOMOUS HEARTBEAT

**Status: RUNTIME VERIFIED — 2026-08-08.** Canonical Node Agent PID 3208 on
MAY083 runs an explicit maintenance/readiness `--heartbeat-only` mode. Supabase
recorded fresh authenticated heartbeats across multiple cycles, `status=idle`,
`observed_state=ACTIVE_IDLE`, no current task. This mode never claims work; P3
must replace it with normal runtime for the controlled Golden task.

Evidence: `reports/evidence/CWS_PRODUCTION_E2E_V2_3_P2_AUTONOMOUS_HEARTBEAT_2026-08-08.md`.

## Goal

Prove MAY083 is authenticated and visible to production without AI keeping it alive.

PASS requires real evidence of:

- canonical Node Agent start
- authenticated heartbeat/ping
- fresh production `last_seen_at`
- eligible/online state according to scheduler rules
- heartbeat continues without Codex issuing periodic commands

---

# P3 — REAL CLAIM -> STORAGE -> BLENDER -> STORAGE -> COMPLETION

**Preparation update — 2026-08-08:** resilient claim now atomically filters
queued work by the authenticated Worker's declared input schemes. MAY083 can
advertise B2-only and cannot consume the historical Drive backlog. Backend and
Node Agent deployment plus a controlled real B2 customer task remain
`NEEDS_VERIFICATION`.

## Goal

Prove one controlled production task through the real Worker pipeline.

Required path:

1. production task exists
2. Worker claims through canonical resilient claim
3. dynamic JobSpec fetched
4. job-scoped input authorization obtained automatically
5. input downloaded
6. real Blender process launches
7. output produced
8. integrity/checkpoint logic runs where current contract requires it
9. job-scoped output authorization obtained automatically
10. output uploaded
11. progress/heartbeat reported
12. task/job reaches correct review/completion state
13. cleanup executes
14. Worker returns to idle

No AI/manual command may be required between claim and completion.

PASS evidence includes real task ID, Worker ID, Blender PID/process evidence, storage object evidence, backend state, and timestamps.

---

# P4 — CUSTOMER UI -> REAL WORKER

PASS path:

`canonical Vercel UI -> backend -> durable job/task -> MAY083 -> Blender -> storage -> realtime progress -> REVIEW_READY/current equivalent`

No demo-only rendering, fake progress, browser mock completion, or AI-assisted state advancement.

Use only currently approved input formats already supported by repository code.

---

# P5 — PAYMENT SANDBOX -> DELIVERY

PASS path:

`REVIEW_READY -> approved/final amount -> QR/payment code -> SePay sandbox webhook -> PAID -> authorized final download`

Payment/webhook/delivery state changes must run deterministically without AI interpretation or manual release.

Do not switch to live payment merely to satisfy E2E testing.

---

# P6 — GOLDEN PRODUCTION E2E + AI-OFF ACCEPTANCE

One traceable production customer-facing job must prove the complete chain:

1. customer opens canonical production site
2. submits approved project input
3. backend creates real job/task
4. scheduler exposes task
5. Worker authenticates
6. Worker claims task
7. JobSpec received
8. scoped storage capability obtained automatically
9. input downloads
10. Blender runs
11. progress reported
12. output produced
13. output uploaded
14. backend reaches review-ready state
15. customer sees real progress/result
16. payment amount generated only at approved stage
17. SePay sandbox confirms payment
18. backend marks PAID
19. authorized final download generated
20. customer downloads result
21. cleanup/idle recovery completes

## AI-OFF test

Before P6 can be DONE:

- provision/start canonical services normally
- turn AI tooling out of the runtime loop
- submit one controlled real job
- do not manually advance job/task states
- observe only
- system must autonomously claim, authorize storage, download, render, upload, report progress, transition states, clean up, process sandbox payment, and deliver

If intervention is required for a normal transition, record it as a defect, fix it, and rerun.

---

# P7 — SCALE-READINESS GATE

Start after Golden E2E passes.

This phase does not require physically operating one million machines. It verifies that the architecture does not force a redesign at obvious growth boundaries.

## Required checks

1. Worker crash recovery
2. stale heartbeat/task recovery
3. retry budget
4. generation fencing
5. two-Worker failover
6. automated second/third Worker enrollment using the same canonical process
7. bulk/unattended enrollment path documented/testable
8. no Founder-created B2 key per Worker
9. revoke one Worker without rotating fleet-wide storage/account credentials
10. model control-plane/data-plane bottlenecks at 100 Workers
11. identify expected bottlenecks at 1,000 Workers
12. architecture review for 1,000,000 Workers: identify which components would need horizontal scaling/sharding/queue changes without requiring a Worker contract redesign
13. add infrastructure only when measurement or validated capacity analysis justifies it

## Scale PASS principle

A solution does not need million-node capacity today. It must avoid a known manual/security boundary that makes million-node growth impossible without changing the fundamental Worker enrollment/storage contract.

---

# BLOCKER POLICY

Codex may stop only for a real external blocker such as:

- missing permission
- missing production secret/account access that cannot safely be derived
- action requiring the physical Windows account/device
- irreversible production action requiring Owner approval

Codex must not stop because:

- documentation is messy
- there are multiple safe implementation choices
- it prefers a refactor
- it wants to redesign unrelated architecture
- AI quota/session is unavailable

When blocked:

1. complete all safe independent work
2. provide runtime evidence of the blocker
3. minimize Founder action
4. explain whether the requested Founder action would scale to 100/1,000/1,000,000 Workers
5. if it would not scale, mark it temporary and implement/propose the scalable replacement before calling the architecture complete

---

# DOCUMENTS-BEFORE-CODE / SOURCE-OF-TRUTH SYNC

After each verified milestone:

- update `CWS_ROADMAP_MVP_V1.md` where applicable
- update `CURRENT_STATUS.md`
- update `DECISIONS.md` for changed architectural decisions
- mark the old per-Worker B2 credential decision SUPERSEDED when this replacement is verified
- write evidence under `reports/`
- commit/push scoped changes

Do not mark runtime work DONE from unit tests alone.

---

# CODEX EXECUTION MODE

Priority:

`Golden E2E > scalable security boundary > AI-independent deterministic runtime > minimum safe implementation > runtime evidence > cleanup/refactor`

Codex must work continuously and perform everything it can itself.

Do not create new Vercel projects, Supabase projects, B2 buckets, Render services, or parallel CWS infrastructure unless Owner explicitly orders it.

---

# IMMEDIATE NEXT TASK

**P1 storage and bounded enrollment are code/schema verified and P2 heartbeat
is runtime verified. Continue P3 using one real authenticated customer-owned B2
upload/task: autonomous claim -> scoped download -> Blender -> scoped upload ->
fenced completion. Do not create a fake job or add per-Worker B2 credentials.**
