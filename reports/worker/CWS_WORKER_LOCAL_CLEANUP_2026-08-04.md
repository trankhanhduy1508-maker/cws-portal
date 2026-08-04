# Worker Local Cleanup Evidence — 2026-08-04

## Implemented

- `cws_worker_full.py` now resets `WORK_DIR/output_task_<task_id>` before each attempt.
- The local directory is removed after failed/no-frame, partial/requeue and normal task paths.
- B2 checkpoint recovery remains authoritative; stale local PNG files are never trusted.
- Timeout cleanup continues to remove partial frame files.
- Cleanup is local-only and does not delete B2 source, preview, final objects or production database rows.

## Validation

- GitHub Actions run #219 PASS; Python static contract covers the cleanup function/call.
- Runtime disk-before/after verification on a Windows Worker is still pending.
- Retry/requeue behavior remains controlled by existing Supabase fencing/RPC and requires physical Worker runtime for full recovery evidence.