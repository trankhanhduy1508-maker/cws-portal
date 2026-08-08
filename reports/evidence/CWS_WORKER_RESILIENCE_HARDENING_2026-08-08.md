# CWS Worker Resilience Hardening Evidence — 2026-08-08

## Scope

Selective resilience patterns were applied to the existing CWS Worker/backend
boundary. OmniRoute remains development tooling only; no OmniRoute runtime,
provider router, broker or new production service was added.

Spec Kit change: `specs/003-worker-resilience-hardening/`
Analyze: `reports/process/CWS_WORKER_RESILIENCE_ANALYZE_2026-08-08.md`

## Implemented contract

- `worker/resilience_policy.py` defines the eight failure categories, task
  retry/Worker-health/security disposition and bounded exponential jitter.
- `worker/worker_engine.py` carries category metadata through the existing
  exception/reporter path and marks archive/path-boundary violations as
  `SECURITY_VIOLATION`.
- `worker/production_node_agent.py` uses bounded storage-operation retry,
  deterministic poll jitter, taxonomy-aware fenced failure reporting and a
  lightweight auth/workspace/Blender probe.
- `backend/src/worker-auth/worker-rpc.service.ts` validates and authenticates
  failure/probe operations; caller-supplied Worker IDs are overwritten.
- `worker_migrations/027_worker_resilience_policy.sql` is additive and
  service-role-only. It uses existing `worker_incidents`,
  `workers.health_state`, `jobs.max_retry_attempts`, task retry/generation and
  the existing capability-aware atomic claim. Thresholds are 3 occurrences for
  `DEGRADED`, 5 for `QUARANTINED`; security is immediately quarantined and not
  auto-cleared.

## Verification

### CODE VERIFIED

- Worker suite: **93 tests, 92 passed, 1 skipped**.
- Backend Jest: **38 suites, 198 tests passed**.
- Backend Nest build: **PASS**.
- Migration privilege/contract test includes the new RPC signatures and
  service-role-only checks: **PASS**.
- Existing claim/failover, generation-fencing, storage-capability and Worker
  engine/archive tests remain in the passing suites.
- Spec Kit prerequisite check with tasks included: **PASS** for feature
  `specs/003-worker-resilience-hardening`.

### SIMULATION VERIFIED

`worker/resilience_simulation.py` ran the same control-plane scenario at 10,
25, 50 and 100 Workers:

| Workers | Startup spread (s) | Unique claims | Operation attempts | Render health | Quarantine | Security probe | Stale completion |
|---:|---:|---:|---:|---|---|---|---|
| 10 | 2.271328 | 10 | 3 | DEGRADED | QUARANTINED | BLOCKED | False |
| 25 | 4.326653 | 25 | 3 | DEGRADED | QUARANTINED | BLOCKED | False |
| 50 | 4.490363 | 50 | 3 | DEGRADED | QUARANTINED | BLOCKED | False |
| 100 | 4.898488 | 100 | 3 | DEGRADED | QUARANTINED | BLOCKED | False |

The simulation covers simultaneous startup, unique claim ownership, storage
transient retry, repeated Blender/host failures, probe recovery/security
blocking and stale generation rejection. It is not a production capacity
claim.

### PRODUCTION RUNTIME VERIFIED

**NOT VERIFIED for this change.** No authenticated physical Worker health
probe/failure task was run against production in this audit, and the new
027 migration was not applied to canonical Supabase from this environment.
Existing production evidence remains separate and does not prove the new
resilience contract. This is an explicit gate, not a fake PASS.

## Known verification note

The repository-wide backend ESLint command currently fails on the pre-existing
worktree line-ending baseline (`prettier/prettier: Delete CR`). Backend Jest
and Nest build pass; no bulk line-ending rewrite was performed because the
worktree contains unrelated Founder changes.

## Rollback

Stop the new Worker/backend pair, restore the previous Node Agent/backend
release, and restore the prior `024_worker_input_capability_claim.sql`
definition of the claim function. Retain incident/state history; do not drop
existing health, lease or fencing columns automatically.
