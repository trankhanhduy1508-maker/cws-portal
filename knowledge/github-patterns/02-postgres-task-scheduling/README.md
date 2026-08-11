# 02 — PostgreSQL Task Scheduling Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: durable Tasks, transactional task graph creation, atomic claim, retries, uniqueness/idempotency, backpressure.

## Primary top-tier sources

### 1. `riverqueue/river` — ~5.5k stars
https://github.com/riverqueue/river

River is a PostgreSQL-native background-job system. Its most relevant lesson for CWS is **transactional enqueueing**: job records become visible together with the application transaction that creates them, avoiding a class of dual-write failures.

CWS lessons:
- create related durable state atomically where possible;
- stable job/task kind/state contracts matter;
- uniqueness is an explicit semantic, not “probably no duplicate”;
- queue state should be inspectable in Postgres;
- failure/retry behavior should be bounded and deterministic.

Do not adopt River itself: CWS is not a Go queue migration project.

### 2. `timgit/pg-boss` — mature Node/PostgreSQL queue
https://github.com/timgit/pg-boss

Why relevant:
- PostgreSQL-first design;
- built around database concurrency primitives such as `SKIP LOCKED`;
- focuses on transactional behavior, retries, scheduling, priorities and dead-letter handling.

CWS lessons:
- `FOR UPDATE SKIP LOCKED` is a proven pattern for concurrent claimers;
- claim and state transition should happen atomically;
- backpressure/queue visibility belongs in the control plane;
- retries need explicit limits and terminal outcomes;
- idempotency and uniqueness should be represented in data, not only in caller discipline.

CWS already uses Postgres atomic claim; this source is reinforcement, not permission to replace current RPCs.

### 3. `graphile/worker` — ~2.3k stars
https://github.com/graphile/worker

A high-performance PostgreSQL job queue for Node.js.

CWS lessons:
- PostgreSQL can handle substantial background work without adding a broker by default;
- application work and job creation can be transactionally aligned;
- keep task definitions explicit and observable;
- add external queue infrastructure only after evidence shows Postgres is the actual bottleneck.

## Secondary architectural comparison

`temporalio/temporal` is a useful high-level reference for durable execution history, retries, timeouts and state-machine thinking. CWS should learn concepts only. Adding Temporal would be a major new infrastructure/architecture decision and is currently out of scope.

## CWS invariants strengthened by these projects

### 1. Durable task graph before claim

Once authoritative frame range is known, create the intended Task coverage durably and transactionally. A Worker should claim from durable truth, not from an in-memory list in a scheduler process.

### 2. Atomic claim

Canonical CWS claim must preserve:

- one authoritative active claimant per Task;
- task status transition in the same DB operation;
- Worker identity assignment;
- lease timestamps/state;
- generation fencing.

### 3. Frame-range uniqueness is a separate invariant

Task-ID claim safety does not prove frame coverage safety.

The task-creation path must validate:

- `start <= end`;
- ranges ordered deterministically;
- no gaps when full coverage is required;
- no overlap;
- exact union equals authoritative Job frame range.

Where practical, combine application validation + one transactional writer + DB defense-in-depth.

### 4. Idempotency

Re-running a scheduler/reconciliation operation must not silently create duplicate coverage.

Prefer a contract such as:

`same authoritative Job metadata + same graph version -> same logical Task coverage`

Rather than “insert again and hope existing tasks stop it.”

### 5. Retry is not duplicate work authority

A retry should normally create a new **attempt/generation** for the same logical Task coverage, not a second overlapping Task.

### 6. Backpressure

Capacity target must be bounded by:

- remaining runnable Tasks;
- eligible Worker capacity;
- DB/control-plane safety;
- task state.

If there are 6 runnable Tasks, desired capacity 10 must not fabricate 4 fake assignments.

## Patterns CWS should not import blindly

- framework-specific job schemas;
- a second queue authority beside current `tasks` table/RPCs;
- exactly-once marketing language without defining failure boundaries;
- Redis/Kafka/RabbitMQ only because other ecosystems commonly use them;
- infinite retries.

## Tests suggested by this knowledge

For Task Graph/Scheduler changes:

- concurrent claimers cannot both win same Task;
- stale generation cannot heartbeat/complete/fail;
- task graph transaction is all-or-nothing;
- repeated graph creation is idempotent or deterministically rejected;
- frame ranges have zero overlaps and zero gaps;
- retry preserves logical frame coverage;
- capacity-constrained state is reported honestly;
- no task is claimed before required durable metadata exists.

## Activation

Load this note only for current work involving Task creation, Scheduler DB logic, claims, retries, task state or Postgres concurrency. It cannot override the active CWS scheduler spec.
