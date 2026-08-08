# CWS — Codex Work Completion Report

Date: 2026-08-08  
Repository: `trankhanhduy1508-maker/cws-portal`  
Canonical branch: `main`

## Executive summary

Codex integrated GitHub Spec Kit into the existing CWS repository and applied a
small, additive Worker resilience hardening change. The change learned selected
resilience patterns from OmniRoute, but did not add OmniRoute to CWS production,
did not replace the PostgreSQL scheduler, and did not create any new project or
infrastructure.

The implementation is code-verified and simulation-verified. Production runtime
verification for migration `027` is explicitly not claimed because the migration
was not applied to canonical Supabase and no authenticated physical Worker run
was performed from this environment.

## 1. Source-of-truth and process work

Codex read the required CWS source-of-truth documents and inspected the current
scheduler, Worker, lease, fencing, storage-capability, migration, and test paths
before changing code.

GitHub Spec Kit was integrated into the repository and made part of the CWS
agent workflow. The relevant artifacts are:

- `.specify/memory/constitution.md`
- `.specify/scripts/`
- `.agents/skills/speckit-*`
- `AGENTS.md`

The resilience change followed:

`Constitution → Specify → Plan → Tasks → Analyze → Implement → Converge/Verify`

Spec Kit change:

`specs/003-worker-resilience-hardening/`

Artifacts:

- `spec.md`
- `plan.md`
- `tasks.md`
- `checklists/requirements.md`
- `reports/process/CWS_WORKER_RESILIENCE_ANALYZE_2026-08-08.md`
- `reports/process/CWS_WORKER_RESILIENCE_CONVERGE_2026-08-08.md`

The checklist contains 19/19 completed requirements. The prerequisite command
with tasks included passed for this feature directory.

## 2. Architecture found and preserved

The existing production ownership model is:

`Job → Task → Worker → Lease → Generation → Output`

The implementation preserved:

- PostgreSQL atomic claim with `FOR UPDATE SKIP LOCKED`.
- Capability-aware task claim.
- Lease timeout and backend task failover.
- Generation fencing for stale Worker updates.
- Stable Worker identity and revocable Worker credentials.
- Task-scoped storage capability instead of broad B2 credentials.
- Existing `workers.health_state` and `worker_incidents` structures.
- Existing backend retry budget (`jobs.max_retry_attempts`).

The existing `max_retries=0` in the canonical production Node Agent was
confirmed as intentional: task retry authority remains in the backend/Postgres
lease/failover path. It was not changed to create a second retry authority.

## 3. OmniRoute patterns adopted

Only bounded resilience patterns were adopted:

- A small shared failure taxonomy and disposition policy.
- Bounded exponential backoff with deterministic jitter.
- Operation retry separated from Worker attempt retry and task failover.
- Worker health thresholds and automatic recovery probing.
- Security failures treated as fail-closed events.
- Deterministic startup/poll jitter to reduce herd behavior.

OmniRoute was treated only as a pattern reference. No OmniRoute runtime,
provider router, model fallback, AI scheduler, broker, or proxy was added to CWS
production.

## 4. Failure taxonomy implemented

The shared policy defines:

- `CUSTOMER_INPUT_ERROR`
- `CAPABILITY_MISMATCH`
- `BLENDER_RENDER_ERROR`
- `WORKER_HOST_ERROR`
- `STORAGE_TRANSIENT`
- `BACKEND_TRANSIENT`
- `NETWORK_TRANSIENT`
- `SECURITY_VIOLATION`

The intended behavior is:

- Customer input errors do not poison or quarantine a Worker.
- Capability mismatch is task-scoped and does not automatically quarantine a
  healthy Worker.
- Storage, backend, and network transients use bounded retry/backoff.
- Repeated Blender/render or host failures affect Worker health by explicit
  thresholds.
- Security violations fail closed and quarantine immediately.

## 5. Health-state and recovery changes

The existing `workers.health_state` was reused; no parallel health state was
created.

Additive migration `worker_migrations/027_worker_resilience_policy.sql` adds:

- Fenced `report_worker_failure` RPC.
- Authenticated `report_worker_probe` RPC.
- Taxonomy validation and service-role-only grants.
- `DEGRADED` after three relevant repeated failures.
- `QUARANTINED` after five relevant repeated failures.
- Immediate quarantine for security violations.
- `PROBING → OK` recovery for successful lightweight probes.
- Security incidents block automatic health clearing.
- The existing capability-aware atomic claim excludes quarantined/probing
  Workers as required by the policy.

The Worker probe checks lightweight local prerequisites such as workspace
writeability and Blender availability. It does not consume a customer job as a
health probe.

## 6. Worker and backend implementation

Changed components include:

- `worker/resilience_policy.py`
- `worker/worker_engine.py`
- `worker/node_agent.py`
- `worker/production_node_agent.py`
- `backend/src/worker-auth/worker-rpc.service.ts`
- `worker_migrations/027_worker_resilience_policy.sql`

The Worker engine now carries failure-category metadata through the existing
reporter path. Archive/path-boundary violations are classified as security
violations. Blender failures distinguish customer input, capability, render,
and host categories.

Production B2 input download now has bounded operation retry with timeout-safe
backoff and storage-transient classification. Backend polling and local retry
reuse the shared deterministic jitter policy rather than duplicating retry
logic.

Authenticated RPC validation prevents caller-supplied Worker IDs from being
trusted and rejects stale task/generation operations.

## 7. Tests and verification

### CODE VERIFIED

- Worker suite: 93 tests, 92 passed, 1 skipped.
- Backend Jest: 38 suites, 198 tests passed.
- Backend Nest build: passed.
- Frontend tests: 12 tests passed.
- Frontend Vite build: passed.
- Existing claim/failover, generation fencing, storage authorization, Worker
  engine, and archive safety tests remained passing.
- New taxonomy, retry, probing, health-state, and simulation tests passed.
- Spec Kit prerequisite and requirements checklist passed; 19/19 checklist
  items complete.

### SIMULATION VERIFIED

The offline simulation covered simultaneous startup, unique claims, storage
transient retry, repeated render/host failure, quarantine recovery, security
blocking, and stale-generation rejection.

| Workers | Unique claims | Operation attempts | Startup spread |
|---:|---:|---:|---:|
| 10 | 10 | 3 | 2.271328 s |
| 25 | 25 | 3 | 4.326653 s |
| 50 | 50 | 3 | 4.490363 s |
| 100 | 100 | 3 | 4.898488 s |

The simulation is not a production capacity claim.

### Known check limitation

Repository-wide backend ESLint remains blocked by the pre-existing CRLF/
Prettier baseline (`prettier/prettier: Delete CR`). No bulk formatting was
performed because the worktree contains unrelated Founder changes.

## 8. Production status and remaining blocker

Production runtime status for this resilience change is:

`PRODUCTION RUNTIME VERIFIED: NOT VERIFIED`

Concrete reason:

1. Migration `027_worker_resilience_policy.sql` was not applied to canonical
   Supabase production from this environment.
2. No authenticated physical Worker failure/probe task was run against
   production.

Therefore this report does not claim production health-state transitions,
RPC behavior, or 100-Worker runtime readiness as production PASS.

No new infrastructure was created. The remaining runtime gate requires the
existing production deployment authority and an authenticated Worker runtime;
it is not substituted with mock or fake evidence.

## 9. Rollback

Rollback is additive and bounded:

- Stop/revert the new Worker/backend release pair.
- Restore the previous Node Agent/backend release.
- Restore the previous `024_worker_input_capability_claim.sql` claim function
  definition if required by deployment procedure.
- Retain incident, lease, generation, and health history.
- Do not drop existing security, fencing, or authorization columns.

## 10. Repository and GitHub delivery

Focused implementation commit:

`b68aa08 feat(worker): harden resilience taxonomy and probing`

Spec Kit integration commit:

`aace2af docs(process): adopt GitHub Spec Kit workflow`

The final documentation commits were published to `main`; final remote commit
verified:

`1547a3e44b1284bec3fb9552d3266acb78b5d0a8`

Unrelated dirty files and old untracked OmniRoute artifacts were not staged in
this report delivery.

