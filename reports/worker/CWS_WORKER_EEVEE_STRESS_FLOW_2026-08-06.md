# CWS Worker Eevee stress flow — 2026-08-06

## Workload

The existing committed scene was used without modification:

```text
tests/assets/cws_blender_unoptimized_eevee_stress.blend
engine: BLENDER_EEVEE (Blender 5.2.0 LTS)
resolution: 1280x720
frames: 1..48
scene SHA-256: 8AE22D0AA2A4131789C6D3E618266BD0ECFC4688D8363E4FA2C868CCD0F14CA0
```

## Local WorkerEngine flow

Runner:

```text
worker/local_stress_worker_flow.py
```

It uses the real local WorkerEngine path: job-scoped download copy, preflight,
Blender CLI with autoexec disabled, progress events, PNG integrity validation,
filesystem checkpoints and cleanup. It does not call backend, Supabase, B2 or
production.

### Worker A

- `worker-stress-a`, attempt `attempt-a`, generation 1.
- Rendered frames 1–24.
- Simulated loss immediately after frame 24 was verified.
- 24/24 checkpoint hashes matched metadata; total 25,030,397 bytes.
- A emitted retryable failure; A did not complete the Job.

### Worker B

- `worker-stress-b`, attempt `attempt-b`, generation 2.
- Reused the same task/checkpoint root and requested frames 1–48.
- Skipped the 24 verified A frames and rendered/uploaded only frames 25–48.
- 48/48 final checkpoints verified; total 52,287,558 bytes.
- B emitted exactly one local completion event.

Evidence artifacts are local and ignored by Git:

```text
tests/artifacts/worker-stress-flow/evidence/worker-stress-a_attempt-a.json
tests/artifacts/worker-stress-flow/evidence/worker-stress-b_attempt-b.json
tests/artifacts/worker-stress-flow/evidence/*.jsonl
```

## Verification matrix

| Area | Result | Boundary |
|---|---|---|
| Same scene through WorkerEngine | REAL RUNTIME VERIFIED locally | Not backend runtime |
| Progress 1..48 | REAL RUNTIME VERIFIED locally | Local JSONL only |
| Frame checkpoint/integrity | REAL RUNTIME VERIFIED locally | Filesystem adapter, not B2 |
| A interruption after frame 24 | SIMULATED local failure | Not power/network loss |
| B recovery of missing frames | REAL RUNTIME VERIFIED locally | Not Scheduler reassign |
| Duplicate local completion | PASS: one B completion, zero A completion | Backend idempotency not exercised |
| Generation fencing/stale A completion | NOT VERIFIED in this run | Requires staging RPC |
| Heartbeat timeout/requeue | NOT VERIFIED | Requires staging backend |
| Admin Fleet state | NOT VERIFIED | Requires authenticated Admin session |
| Customer recovery status | NOT VERIFIED | Requires backend/frontend runtime |
| Payment before completion | NOT CREATED | No payment path was invoked |
| B2 upload/finalize | NOT VERIFIED | No staging B2 credential |

## Exact commands

Worker A interruption rehearsal:

```powershell
python worker/local_stress_worker_flow.py `
  --scene tests/assets/cws_blender_unoptimized_eevee_stress.blend `
  --blender C:\path\to\blender.exe `
  --worker-id worker-stress-a --attempt-id attempt-a --generation 1 `
  --frame-start 1 --frame-end 48 --stop-after-frame 24 `
  --checkpoint-root tests/artifacts/worker-stress-flow/checkpoints `
  --evidence-dir tests/artifacts/worker-stress-flow/evidence
```

Worker B recovery:

```powershell
python worker/local_stress_worker_flow.py `
  --scene tests/assets/cws_blender_unoptimized_eevee_stress.blend `
  --blender C:\path\to\blender.exe `
  --worker-id worker-stress-b --attempt-id attempt-b --generation 2 `
  --frame-start 1 --frame-end 48 `
  --checkpoint-root tests/artifacts/worker-stress-flow/checkpoints `
  --evidence-dir tests/artifacts/worker-stress-flow/evidence
```

## Remaining runtime gate

The complete requested chain—Customer/Test Job, backend creation, Scheduler
selection, authenticated heartbeat loss, RPC reassign, stale completion reject,
Admin state and Customer recovery—still requires isolated staging DB/backend,
two authenticated Worker hosts and staging B2. No production was touched and
no production/physical Worker PASS is claimed.
