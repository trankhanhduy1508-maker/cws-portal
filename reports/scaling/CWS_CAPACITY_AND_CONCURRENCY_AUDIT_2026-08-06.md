# CWS Capacity and Concurrency Audit — 2026-08-06

## Evidence boundary

This audit uses canonical `main` at `de3b923`, repository code/migrations/tests,
and the local contract simulation `tests/scaling/cws_capacity_simulation.py`.
No staging credentials are present here; no production/Supabase/B2/payment
capacity claim is made.

## One-job path

| Step | Implementation | Concurrency notes |
|---|---|---|
| Upload/Drive | `POST /files/upload`, `POST /drive/resolve` | `.blend` only; upload is now disk-streamed with 2 GB limit. Disk/B2 concurrency remains unmeasured. |
| Job create | `POST /jobs` → `JobsService.createOrder()` → `render_orders`, `jobs`, probe `tasks` | Supabase is the durable boundary; no broker/queue. |
| Scheduler | `SchedulerService` every 10 s | Reads all active orders and tasks; narration/state sync, not the claim lock. |
| Claim | `claim_next_*` RPC | `FOR UPDATE SKIP LOCKED`, capability/health/fresh heartbeat checks, generation/attempt fencing. |
| Render/progress | Node Agent/Worker Engine | Bounded process timeout, checkpoint, integrity validation, heartbeat/stage RPCs. Physical production runtime unverified. |
| Output | B2 checkpoint/upload and task completion | Stale generation completion is rejected by the contract. |
| Payment | `approve()` only from `REVIEW_READY`; webhook after `AWAITING_PAYMENT` | Notification replay uses unique transaction id. Payment one-intent migration is prepared but not applied. |
| Download | `FINISHED` + signed B2 URL | Not unlocked before payment/finalization. |
| Realtime/Admin/CRM | WebSocket + Supabase Realtime; fleet list; three CRM reads | Per-client subscriptions and full fleet/CRM result sets are unmeasured at scale. |

## Findings and changes

### P0 — concurrent payment intent race

Before this audit, `approve()` could create two intents concurrently before
`attachPayment()` updated the order. `attachPayment()` now requires
`status=REVIEW_READY` and `payment_id IS NULL`. The additive migration
`backend/migrations/017_payment_one_intent_per_job.sql` adds a partial unique
index on `payments(job_id)` and aborts without data mutation if historical
duplicates exist. Production is not claimed fixed until this migration passes
duplicate preflight in isolated staging.

### P1 — scheduler query amplification

Previously each active order called `countOnlineWorkers()` and a slow cron
could overlap the next tick. The scheduler now takes one fleet presence
snapshot per tick and skips overlapping ticks. Regression tests cover both.
Per-order task reads remain the next staging optimization target.

### P1 — upload memory pressure (fixed in code)

`FileInterceptor` previously used memory storage and B2 consumed `file.buffer`.
It now writes through a disk-backed stream, B2 reads with `createReadStream`,
and success/error/client-abort cleanup is covered by tests. The 2 GB limit is
still a safety bound, not a capacity guarantee; disk space, B2 bandwidth and
true concurrent upload behavior remain staging measurements.

### P1 — scheduler query amplification (further reduced)

The scheduler now batch-reads task state in groups of 200 Job IDs, in addition
to its one presence snapshot and tick mutex. Task reads are now approximately
`ceil(active_jobs/200)` per tick; Worker claim locking is unchanged. Staging
must still measure large batches and total task-row volume.

### P1/P2 — scheduler and horizontal scale

`findActiveOrders()` is unpaginated and the scheduler is an in-process poller;
multiple backend replicas could duplicate narration/finalization work. Worker
claim remains DB-serialized, but a leased single runner or idempotent summary
RPC is needed before horizontal scale. Realtime also re-reads one order per
update per client, and Admin Fleet/CRM load full result sets.

### Security/abuse

Worker identity/RPC injection, generation fencing, capability checks and
payment webhook transaction replay guards are present in code/migrations.
Upload/job creation and webhook burst quotas are not load-tested here and
need explicit rate-limit/quota work before public abuse-scale testing.

## Safe local simulation

Command: `python tests/scaling/cws_capacity_simulation.py`

The simulation is in-memory only and excludes network, Postgres/RLS, B2,
Blender, payment provider, and Render limits. Results:

| Scenario | Claimed | Duplicate claims | Claim loop | Heartbeat events | Max heartbeat/s | Max reconnect/s |
|---|---:|---:|---:|---:|---:|---:|
| 100 jobs / 1,000 workers | 100 | 0 | 0.028 ms | 1,000 | 179 | 62 |
| 1,000 jobs / 10,000 workers | 1,000 | 0 | 0.250 ms | 10,000 | 1,719 | 62 |

These are algorithmic measurements, not capacity numbers.

## Capacity answer

### 100 customers / 1,000 workers

**PARTIAL / NOT production-capacity PASS.** Pull-claim primitives model cleanly
with no duplicates, but upload RAM, scheduler task reads, and real Supabase/B2
limits are unmeasured. A real PASS requires isolated staging load metrics,
heartbeat/reassign storm, payment migration, and output integrity evidence.

### 1,000 customers / 10,000 workers

**NOT READY / UNMEASURED.** The current identity/RPC/B2/payment contracts are
upgradeable, but the poller, full-result queries, heartbeat writes, realtime
fanout and single backend instance need measured redesign before this scale.

## Next scale test

Use an isolated staging Supabase project and B2 bucket. Run 100/1,000 first;
collect p50/p95/p99 RPC and scheduler latency, DB connections/errors,
heartbeat throughput, reassignment latency, duplicate/fenced completions,
B2 latency, and backend CPU/RAM. Repeat 1,000/10,000 only after the first
run is bounded and clean. Never use production.
