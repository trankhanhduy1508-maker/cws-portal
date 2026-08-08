# CWS Production E2E V2.2 — P0 Reality Check

Date: 2026-08-08  
Production Supabase project: `ynhxlxetwuiyejcjypsi`  
Canonical backend: `https://cws-portal.onrender.com`

## Production state verified

- Supabase project status: `ACTIVE_HEALTHY`, PostgreSQL 17.6.
- Migration history contains:
  - `020_worker_identity_rpc_auth_contract`
  - `021_production_failover_reassign_contract`
  - `022_production_dynamic_task_spec_rpc`
- Required tables exist: `worker_identities`, `worker_auth_nonces`,
  `worker_leases`, and `task_attempts`.
- Required schema fields exist for retry, heartbeat, capability and generation
  fencing.
- Required canonical RPCs exist with the expected signatures:
  `worker_ping`, `claim_next_resilient_task`, `get_claimed_task_spec`,
  `report_heartbeat`, `complete_task`, `fail_task`, `update_task_stage`,
  `report_worker_state_transition`, and `requeue_stale_tasks`.
- Runtime counts at verification time: 29 Worker registry rows, 0 identities,
  0 leases, 0 fresh Workers in 180 seconds, and 247 queued/active tasks.
- Render backend `/health`: HTTP 200.
- Anonymous POST to `/worker/rpc/worker_ping`: HTTP 401.

## P0 finding and remediation

Before remediation, production ACL metadata showed multiple historical Worker
RPCs executable by `anon` and `authenticated`, including claim, heartbeat,
completion, failure and state mutation RPCs. This bypassed the canonical
Backend HMAC Worker gateway even though migrations 020/021/022 were present.

Migration `worker_rpc_gateway_only` was applied as production version
`20260808023827`. Repository source is
`worker_migrations/023_worker_rpc_gateway_only.sql`.

Post-apply verification for all covered current and historical Worker RPCs:

- `anon_execute = false`
- `authenticated_execute = false`
- `service_role_execute = true`
- `search_path = public, pg_temp`

No migration 020/021/022 was re-applied. No Worker, job, task, payment, B2
object or customer row was changed.

## P0 result

**PASS.** Production reality is reconciled and the canonical Worker trust
boundary is now Backend gateway only.

## First real blocker / next phase

P1 provisioning remains open. MAY083 has no production identity row, DPAPI
credential, or scoped B2 runtime credential. The next implementation task is
one-command provisioning around the existing per-worker HMAC/DPAPI contract;
no Supabase service-role key may be placed on the Worker.

