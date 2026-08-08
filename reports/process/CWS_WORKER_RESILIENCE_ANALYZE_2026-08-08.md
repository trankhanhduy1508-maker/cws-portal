# CWS Worker Resilience Analyze — 2026-08-08

Status: **ANALYZE COMPLETE — implementation gate passed**

Feature: `specs/003-worker-resilience-hardening/`

This report is the required Spec Kit Analyze artifact. It uses the current
repository/code contracts, not historical assumptions. No production mutation
was performed while writing it.

## 1. Existing OmniRoute-equivalent patterns

The official OmniRoute material reviewed was the repository documentation for
CLI integrations, Codex configuration, compression and API usage/observability
at the official `diegosouzapw/OmniRoute` repository. The useful patterns are
bounded retries, fallback classification, deterministic request identity and
usage evidence. Its model/provider routing and context compression are not CWS
runtime patterns.

CWS already has the following equivalent patterns at the correct boundary:

| Pattern | Concrete CWS evidence | Finding |
|---|---|---|
| Atomic ownership | `worker_migrations/021_production_failover_reassign_contract.sql:62-129`, superseded by the capability-aware 3-argument contract in `024_worker_input_capability_claim.sql:7-83` | Existing PostgreSQL claim with `FOR UPDATE SKIP LOCKED`; preserve. |
| Lease/fencing | `021...sql:31-59`, `worker/worker_engine.py:771-809` | Heartbeat/generation is checked before progress, storage side effects and completion; preserve. |
| Bounded task retry | `021...sql:131-183` | `jobs.max_retry_attempts` default 3, task `retry_count`, generation increment and failed-worker recording already exist. |
| Startup herd control | `worker/production_node_agent.py:225-231`, `test_production_node_agent.py:test_100_worker_startup_is_stably_staggered` | Stable Worker-ID jitter over five seconds already exists. |
| Single-flight heartbeat | `worker/node_agent.py:40-88,210-229`, tests `test_non_blocking_heartbeat_*` | One queued heartbeat and no blocking state tick already exist. |
| Poll backoff | `worker/production_node_agent.py:831-861` | Bounded 5-to-60 second exponential poll backoff exists, but no deterministic retry jitter. |
| Output idempotency/fencing | `worker/production_node_agent.py:638-644`, `worker/worker_engine.py:802-809` | Remote verification and pre-side-effect fencing exist. |
| Health read gate | `024...sql:42`, `backend/src/jobs/worker-fleet-state.ts:42-74` | Existing `health_state` and derived recovery view are read, not automatically managed. |

## 2. Missing patterns

1. `worker/worker_engine.py:52-69` only has `RETRYABLE`/`PERMANENT`; it does
   not preserve the boundary-specific taxonomy needed to decide whether a
   Worker should be penalized.
2. `ProductionReporter.fail` at
   `worker/production_node_agent.py:705-707` collapses every failure to
   `transient` or `permanent` before the backend sees it.
3. `backend/src/worker-auth/worker-rpc.service.ts:7-20,106-156` has no
   authenticated failure-taxonomy or probe operation.
4. Existing `workers.health_state` is not automatically set by Worker
   failures. The only explicit setter found is the admin action in
   `worker_migrations/008_admin_worker_actions.sql:188-209`; enrollment in
   `026_bounded_worker_enrollment.sql:96-101` initializes `UNKNOWN`.
5. There is no automatic half-open/probing path. `worker-fleet-state.ts` maps
   `DEGRADED`/`QUARANTINED` to a display state but does not change database
   health or run a readiness probe.
6. `_download_capability` and `_upload_capability` at
   `worker/production_node_agent.py:269-319` perform one operation attempt;
   B2 checkpoint calls similarly do not have a small shared operation retry
   policy.
7. Poll recovery at `production_node_agent.py:831-861` has no per-Worker
   deterministic jitter after backend recovery, so a fleet can converge on the
   60-second cap.

## 3. Patterns explicitly rejected

- OmniRoute's provider/model routing, fallback to weaker models, context
  compression and usage proxy are rejected for CWS production.
- A new scheduler/routing engine is rejected; `claim_next_resilient_task` and
  PostgreSQL `SKIP LOCKED` remain the authority.
- Redis/NATS/Kafka/event sourcing/service mesh is rejected because current
  evidence already demonstrates algorithmic 100-Worker claim uniqueness and no
  measured infrastructure bottleneck.
- A customer task is rejected as a health probe; the probe must be local and
  lightweight.
- Local Worker attempt retry is not promoted to task ownership. The canonical
  production runtime explicitly sets `max_retries=0` at
  `production_node_agent.py:847` and the comment identifies the backend lease
  timeout as recovery authority. This is intentional delegation, not a defect
  shown by the audit.

## 4. Retry authority

| Tier | Current authority | Evidence | Decision |
|---|---|---|---|
| Operation retry | Mostly the operation adapter/caller; currently incomplete | `_download_capability`/`_upload_capability` and B2 checkpoint methods | Add one bounded shared policy for network/storage/backend operations only. |
| Worker attempt retry | Node Agent state machine | `worker/node_agent.py:90-205`; tests `test_retry_is_bounded_then_cleanup` and `test_retry_jitter_is_bounded_and_deterministic` | Keep generic capability; canonical production passes `max_retries=0` so it does not duplicate task ownership. |
| Task retry/failover | PostgreSQL lease/requeue contract | `021...sql:131-183`; `failover_simulation.py` | Preserve `max_retry_attempts`, `retry_count`, `failed_by`, generation fencing and stale requeue. |

Therefore this change must not set production `max_retries` to a positive
value. It adds taxonomy-aware reporting and operation retry while leaving the
existing task retry authority intact.

## 5. Is `max_retries=0` intentional or a defect?

It is intentional in the canonical production adapter. The exact code at
`worker/production_node_agent.py:843-850` constructs `NodeAgent` with
`max_retries=0`; immediately above the poll loop the comment says backend lease
timeout remains recovery authority. The backend contract has its own bounded
budget (`jobs.max_retry_attempts`, default 3, checked 1-10) and increments the
task generation on stale failover. No evidence shows a duplicate local retry
bug. Changing it would create two competing retry authorities and is rejected.

## 6. Where `health_state` is set/reset

- Column declaration: `worker_migrations/000_worker_fleet_base_schema.sql:75`
  and additive documentation/schema in `001_worker_state_machine_schema.sql:41-56`.
- Initial state: `026_bounded_worker_enrollment.sql:96-101` sets `UNKNOWN`.
- Manual quarantine/clear: `008_admin_worker_actions.sql:188-209` sets
  `QUARANTINED` or `NULL` through an admin RPC.
- Claim reads it and excludes `QUARANTINED`/`DEGRADED`: `024...sql:42`.
- Backend display reads it in `worker-fleet.gateway.ts:136-176` and maps it in
  `worker-fleet-state.ts:42-74`.
- No Worker failure callback or probe currently sets it. This is the primary
  missing production policy addressed by the implementation.

## 7. Does automatic recovery already exist?

No. `NodeState.RECOVERY` in `worker/node_agent.py:20,183-199` is local
task-attempt cleanup/retry state, not persistent Worker health recovery.
`health_state` has no `PROBING` transition, no probe RPC and no automatic reset.
`mark_stale_workers_offline()` only marks presence stale/offline; it does not
heal `health_state`. The new probe path must remain separate from
`ACTIVE_IDLE`, because the architecture already uses `ACTIVE_IDLE` correctly
for online idle presence.

## 8. Backend down for 60 seconds, then recovery, with 100 Workers

Current behavior:

1. Startup is deterministically spread over 0-5 seconds by Worker ID.
2. `NodeAgent` keeps heartbeat single-flight and records errors without killing
   the agent.
3. `run_forever` catches the failed tick and sleeps with poll backoff
   5,10,20,40,60 seconds, then also sleeps the normal poll interval.
4. After recovery, every Worker whose backoff expires can claim/ping close to
   the cap; there is no deterministic per-Worker reconnect jitter.
5. Durable tasks remain in Postgres. A task only fails over after the existing
   stale lease threshold (240 seconds), and stale generations are fenced.

Conclusion: claim ownership remains safe and heartbeat is bounded, but
reconnect timing can still herd at the cap. The smallest fix is deterministic
bounded jitter in the existing backoff helper, not a new broker.

## 9. B2 transient failure classification

`ProductionB2CheckpointStore.put` at
`worker/production_node_agent.py:638-644` wraps all errors as
`RetryableWorkerError("B2 output upload failed")`; `_download_b2` similarly
maps unexpected errors to `RetryableWorkerError("B2 project download failed")`.
This correctly avoids a permanent input failure but loses the distinction
between storage transient and Worker host failure. No code updates
`health_state` for it. The implementation will classify it as
`STORAGE_TRANSIENT`, retry the operation with a bounded policy, and leave
Worker health unchanged.

## 10. Repeated Blender crash behavior

`classify_blender_failure` at `worker/worker_engine.py:57-69` returns only
`PERMANENT` for a few input markers and `RETRYABLE` otherwise. The renderer at
`worker/worker_engine.py:646-727` raises the two coarse exception types.
`WorkerEngine.run` at `worker/worker_engine.py:760-821` reports only
`permanent`/`retryable`; `ProductionReporter.fail` turns that into the legacy
`fail_task` error type. Therefore repeated Blender crashes can consume backend
retry budget and be recorded as task failures, but they do not currently
change the Worker health score/state. The implementation will classify
render/host failures, atomically record them in the existing incident table,
and transition the same Worker to `DEGRADED`/`QUARANTINED` only at explicit
bounded thresholds.

## Security and scale conclusion

The change is additive and keeps credentials in the existing authenticated
gateway. Worker failure/probe functions must validate Worker identity and task
generation before task mutation, and migration grants must remain
service-role-only. Security failures cannot be auto-cleared. The 100-Worker
anti-herd solution is deterministic jitter plus existing single-flight
heartbeat and `SKIP LOCKED`, not another infrastructure layer.

## Clarify result

No clarification was necessary. The source-of-truth documents define the
architecture, security and retry boundaries sufficiently; changing those
boundaries would require a new Owner decision and is outside this change.

## Evidence classification before implementation

- Existing code/tests: **CODE VERIFIED** for the patterns listed above.
- Existing failover and 100-Worker harnesses: **SIMULATION VERIFIED**, not
  production capacity proof (see `worker/test_failover_simulation.py` and
  `reports/scaling/CWS_P0_SCALING_AND_ZIP_E2E_READINESS_2026-08-07.md`).
- Canonical production Worker health/recovery runtime: **NOT VERIFIED** before
  this implementation because no authenticated Worker identity/lease runtime
  is available in the current environment.
