# CWS 100-Customer Backend Load Simulation — 2026-08-06

## Evidence boundary

This is **simulated load**, not staging or production capacity evidence. The
test boots the real Nest `AppModule`, real HTTP controllers, `JobsService`,
real scheduler state transitions, DTO validation, and the real customer job
submission/status routes on a loopback port. It replaces only external
persistence, Worker RPC/storage, preview, and payment boundaries with
deterministic in-memory adapters. No Supabase, B2, Blender, payment, email,
or production endpoint was contacted.

Command:

```text
cd backend
npm run test:e2e -- --runInBand
```

Test file: `backend/test/load-simulation.e2e-spec.ts`.

## Scenarios and observed metrics

| Customers | Synthetic Workers | Submitted | Status refresh | Review-ready | Duplicate claims | Failovers | p95 submit ms | p99 submit ms | Scheduler ms | Result |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 10 | 3 | 10 | 10 | 10 | 0 | 0 | 7.12 | 7.12 | 0.49 | PASS |
| 25 | 6 | 25 | 25 | 25 | 0 | 1 | 14.75 | 15.01 | 0.30 | PASS |
| 50 | 12 | 50 | 50 | 50 | 0 | 1 | 39.71 | 39.78 | 0.85 | PASS |
| 100 | 25 | 100 | 100 | 100 | 0 | 1 | 59.14 | 59.27 | 1.44 | PASS |

The 100-customer case also exercised a ramp-up of 100 real `/jobs/estimate`
requests, 100 simultaneous `/jobs` submissions, 100 status refreshes,
worker shortage, one timeout/disconnect/reconnect failover, generation-fenced
stale completion rejection, and bounded completion. All ramp-up requests
returned successfully.

## Duplicate submission finding

Two simultaneous identical `POST /jobs` requests created two different jobs.
This is the observed current contract: there is no idempotency-key field or
unique submission key in the current MVP API/schema. It is **not** counted as a
duplicate Worker claim, but it remains a P1 abuse/retry risk for real clients
that retry after an uncertain network response. No schema or production change
was made in this load run.

## Capacity conclusion

- **Simulated application/API flow:** PASS for 10/25/50/100 under this local
  topology and workload.
- **Staging infrastructure capacity:** NOT VERIFIED. Postgres connection
  limits, RLS/query latency, B2 bandwidth, realtime fanout and physical
  Worker throughput were not measured.
- **Production capacity:** NOT CLAIMED.

## SQL/Redis decision evidence

The repository contains no Redis client, Redis environment contract, or Redis
deployment. Worker heartbeat/lease and generation fencing are currently
atomic PostgreSQL operations; state-transition history is deliberately not
written for every heartbeat. PostgreSQL/Supabase remains the source of truth
for workers, jobs, tasks, payments and render results. Redis is deferred until
isolated staging measures a real presence/write bottleneck; if introduced
later it may cache TTL presence/locks/progress only, with PostgreSQL fallback
and no financial truth in Redis.

## Remaining blockers

Authenticated staging Supabase/B2 credentials, physical Workers, real Blender
render, Google customer session and payment sandbox/live approval are required
for the next evidence level. The duplicate-submission idempotency contract
also needs an explicit product/schema decision before implementation.
