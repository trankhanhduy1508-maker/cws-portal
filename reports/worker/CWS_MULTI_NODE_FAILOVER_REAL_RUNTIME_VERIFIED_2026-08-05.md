# Multi-node / failover — REAL RUNTIME VERIFIED

Date: 2026-08-05. Scope: Supabase and B2 staging only.

- CODE/UNIT VERIFIED: staging assignment, lease generation and fencing contract.
- REAL RUNTIME VERIFIED: two independent Windows Node Agents claimed separate tasks concurrently; task 7 completed on worker-02 while task 6 was interrupted on worker-01.
- REAL RUNTIME VERIFIED: task 6 was requeued by the staging stale-heartbeat policy at generation 2, then claimed and completed by worker-02. Its state events ended in ACTIVE_IDLE.
- REAL RUNTIME VERIFIED: `complete_task(6, 1, 'cws-staging-worker-01')` returned `false` after generation 2 completion; no double-complete occurred.
- REAL RUNTIME VERIFIED: both parent processes exited and the owned cleanup path left no Blender process.

The first concurrent run exposed a shared test workspace/spec race; it was not treated as PASS. The staging task was recovered under the real stale-lease contract and rerun with an isolated workspace. Production was not touched.

