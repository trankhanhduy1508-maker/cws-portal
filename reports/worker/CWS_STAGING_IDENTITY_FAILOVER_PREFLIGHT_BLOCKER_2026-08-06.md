# Staging identity/failover preflight — 2026-08-06

## Result

`020_021_preflight_check.sql` was not executed because this machine has no
staging database access mechanism:

- `supabase` CLI: unavailable
- `psql`: unavailable
- repository `.mcp.json`: absent
- staging/Supabase/DATABASE/POSTGRES/CWS environment variable names: none
- no staging endpoint or credential was present

No migration was applied to staging or production. No credential was created,
no Worker was contacted, and no database mutation was attempted.

## Ready-to-run order

From the repository root in an authenticated staging SQL session:

```sql
-- 1. Read-only gate
\i worker_migrations/020_021_preflight_check.sql

-- 2. Only if preflight has no BLOCKED result
\i worker_migrations/020_worker_identity_rpc_auth_contract.sql
\i worker_migrations/021_production_failover_reassign_contract.sql
```

Then verify the schema/functions with the queries in the preflight file and
run `worker/failover_simulation.py` locally. The live two-Worker matrix still
requires two staging hosts, DPAPI stores, staged Worker rows/credentials and a
staging backend deployment.

## Verification completed without staging access

- Offline failover/credential/Admin simulation: 6 scenarios PASS.
- Worker suite: 48 tests PASS.
- Backend: 26 suites / 152 tests PASS; build PASS.
- Frontend: 4 files / 9 tests PASS; build PASS.

This is preparation evidence only, not staging runtime PASS.
