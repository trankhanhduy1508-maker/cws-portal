# CWS Full Security Audit — 2026-08-05

Scope: repository, staging metadata/RPC contract, and existing runtime evidence. Production database was queried read-only for metadata/function definitions only. No customer/job rows or secrets were copied.

## Executive result

Production rollout remains **NO-GO**. The current tree has no confirmed Critical exploitable issue after the fixes below, but High items remain blocked by dependency-major upgrades, production RPC privilege migration, and a real host isolation boundary for untrusted `.blend` files.

## Findings

| Severity | Status | Finding / disposition |
|---|---|---|
| HIGH | FIXED (current tree) | Legacy `cws_worker_full.py` contained embedded Supabase/B2 credentials. It now fails closed and reads environment variables only. Historical copies still require rotation/revocation; values are intentionally not reproduced here. |
| HIGH | FIXED (staging) | `admin_*` SECURITY DEFINER RPCs were executable by `anon`/`authenticated`; staging migration `018_staging_admin_rpc_execute_hardening` revoked PUBLIC/client EXECUTE and pinned `admin_cancel_job` search_path. Production was not mutated; apply the reviewed equivalent before rollout. |
| HIGH | FIXED | Admin result download no longer puts the staff token in a query string; it uses an Authorization header and a Blob download. |
| HIGH | BLOCKED | Backend dependency audit still reports nine High findings on the Nest 10 major line after non-force remediation. `npm audit fix --force` would require a major upgrade and is not an unattended safe fix. Plan a Nest 11 canary/compatibility upgrade. |
| HIGH | UNVERIFIED | Host filesystem/network isolation for hostile `.blend` is not integrated into the Worker. The Job Object POC proves process-tree cleanup only; Windows Sandbox is unavailable on this host. |
| MEDIUM | UNVERIFIED | CORS currently defaults to `*` when `CORS_ORIGIN` is absent. Production must require an explicit allowlist and fail closed. |
| MEDIUM | UNVERIFIED | Node heartbeat and B2 adapter I/O are synchronous from the state-machine loop. B2 staging now has bounded connect/read timeouts and standard retries; a non-blocking supervisor boundary is still needed. |
| MEDIUM | ROTATE REQUIRED | Secret-bearing legacy history must be treated as compromised even though current source no longer contains those values. Rotate the affected Supabase/B2 credentials outside this report. |
| LOW | VERIFIED | Root npm audit is clean; frontend build/lint/tests pass. Frontend scan found no `service_role`, `dangerouslySetInnerHTML`, or `innerHTML`. |
| LOW | UNVERIFIED | Frontend build reports a large chunk. Optimize only with bundle evidence; not a security gate. |

## Verified controls

- Backend uses server-side Supabase service credentials; browser code does not receive `service_role`.
- Webhook paths preserve raw request bytes and use timestamp/signature guards with replay/rate-limit controls where implemented.
- Child process launch uses argument arrays rather than shell command composition.
- Existing Worker evidence verifies lease generation/fencing, output checksum, B2 staging prefix, and staging/prod separation.
- Supabase staging tables `fleets`, `workers`, `jobs`, `tasks`, and `task_attempts` have RLS enabled. `staff_roles` and `staff_worker_access` intentionally have no client policies; access is server-side.
- Staging admin RPC verification after migration: `anon_execute=false`, `authenticated_execute=false`; `admin_cancel_job` has `search_path=public, pg_temp`.

## Required before production

1. Apply and verify the reviewed admin RPC privilege/search_path migration in production through the normal change process; this audit did not mutate production.
2. Upgrade backend dependencies via a tested major-version canary, then rerun audit and integration tests.
3. Require explicit production CORS configuration, secure headers, rate limits, and log redaction checks in deployment configuration.
4. Integrate a real filesystem/network boundary around the Worker; Job Objects alone are process supervision, not a security sandbox.
5. Rotate legacy credentials and verify no secret remains in current tree, artifacts, CI logs, or deployment history.

## Evidence

- `worker_migrations/018_staging_admin_rpc_execute_hardening.sql`
- `worker/isolation_poc_job_object.py` and `reports/worker/CWS_HOSTILE_BLEND_ISOLATION_POC_2026-08-05.md`
- `src/services/adminApi.js`
- `backend/package-lock.json` audit remediation
- `reports/worker/CWS_STAGING_FULL_E2E_REAL_RUNTIME_VERIFIED_2026-08-05.md`
