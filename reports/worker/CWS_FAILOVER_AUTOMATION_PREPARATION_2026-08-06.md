# CWS failover automation preparation — 2026-08-06

## Migration audit

- `020` is additive/idempotent and depends on the existing `workers` table.
- `021` depends on `jobs`, `tasks`, `workers`, `task_attempts`, generation and
  heartbeat columns; existing task rows are not rewritten by migration.
- DDL uses `lock_timeout=5s` and `statement_timeout=30s`, failing closed on a
  busy production table. The retry check is `NOT VALID`, avoiding a full scan.
- `020_021_preflight_check.sql` is read-only and blocks on missing base schema;
  it reports active tasks with null heartbeat as a warning.
- `020_021_rollback_runbook.md` documents dependency-safe rollback. Identity
  tables are retained; revocation is safer than deleting audit data.

## Provisioning and rehearsal

- Python helper generates a per-Worker credential, stores it with DPAPI, and
  writes only a hash SQL file. PowerShell wrapper applies explicit
  least-privilege Windows ACLs; it was not run on a physical Worker.
- Production `register_worker` is not in the authenticated RPC allowlist, so a
  compromised Worker cannot self-assign a fleet or inflated capability.
- Offline simulator covers stale heartbeat/network/power loss, process and
  renderer crash, reconnect, fencing, duplicate completion, retry limit,
  unhealthy/capability-incompatible replacement, multiple failure, no
  suitable Worker, Idle Saver wake, Customer recovery status and payment gate.
  It also exercises Admin Fleet state mapping and credential revoke/expiry/
  rotation semantics without using a real secret.
- Live two-Worker smoke remains credential/physical-host gated. No production
  mutation, payment or live claim was attempted.

## Evidence boundary

CODE/UNIT VERIFIED only. The simulator is not runtime evidence for Windows
power loss, GPU crash, B2, Supabase cron or physical failover.
