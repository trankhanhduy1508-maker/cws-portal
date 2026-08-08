# Requirements Checklist: Worker Resilience Hardening

**Purpose**: Verify the change stays inside the existing CWS architecture and
does not accidentally import OmniRoute production runtime behavior.
**Created**: 2026-08-08
**Feature**: `../spec.md`

## Architecture boundaries

- [x] CHK001 PostgreSQL atomic claim and `FOR UPDATE SKIP LOCKED` remain the ownership authority.
- [x] CHK002 Job/task/worker/lease/generation/output ownership is unchanged.
- [x] CHK003 No OmniRoute/Codex/AI runtime dependency is added to production CWS.
- [x] CHK004 No Kafka, NATS, Redis, Kubernetes, scheduler service or new project is introduced.
- [x] CHK005 Worker identity, revocation and task-scoped storage capability boundaries remain intact.

## Failure and health behavior

- [x] CHK006 All eight failure taxonomy categories are validated at the authenticated boundary.
- [x] CHK007 Customer input and capability errors do not quarantine a Worker.
- [x] CHK008 Storage/backend/network transient errors use bounded retry and do not alter Worker health.
- [x] CHK009 Repeated host/render errors have explicit thresholds and audit evidence.
- [x] CHK010 Security violations fail closed and cannot be auto-cleared by probing.
- [x] CHK011 Probe start excludes the Worker from claim; successful non-security probe returns it to `OK`.

## Retry and scale

- [x] CHK012 Operation retry is separate from Worker-attempt retry and task failover.
- [x] CHK013 Existing backend retry authority and `max_retries=0` delegation are preserved unless evidence says otherwise.
- [x] CHK014 Exponential backoff is bounded and jittered deterministically.
- [x] CHK015 10/25/50/100 simulations show no duplicate ownership or stale completion acceptance.

## Verification and reporting

- [x] CHK016 Existing backend/Worker/fencing/storage tests pass.
- [x] CHK017 Code, simulation and production runtime evidence are labeled separately.
- [x] CHK018 Rollback and migration application status evidence are recorded.
- [x] CHK019 Current status, roadmap, decisions and evidence docs are synchronized.
