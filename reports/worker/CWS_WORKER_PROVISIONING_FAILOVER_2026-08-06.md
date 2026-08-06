# CWS Worker provisioning and failover preparation — 2026-08-06

## Completed in code

- Migration `020` remains the per-Worker identity and replay-cache contract;
  no shared fleet secret is introduced.
- Additive migration `021` adds healthy/capability-aware pull claim, one
  `task_attempts` row per claim, generation fencing, stale-heartbeat requeue,
  failed-Worker recording, attempt superseding, and bounded retry via
  `jobs.max_retry_attempts` (default 3, bounded 1–10).
- `WorkerRpcService` exposes the authenticated `claim_next_resilient_task`;
  caller-supplied `p_worker_id` is ignored.
- `worker/provision_worker_identity.py` generates a per-Worker token, stores
  it through Windows DPAPI, and writes only a SHA-256 hash SQL file.
- `worker/staging_identity_smoke.py` performs authenticated staging ping and
  opt-in resilient claim; it refuses known production hosts.

## Staging procedure

1. Apply migrations `020` and `021` to isolated staging Supabase.
2. Create the Worker row through the approved provisioning process.
3. Run the provisioning helper as the dedicated least-privilege Worker
   account. Apply its hash-only SQL through the approved server-side path.
4. Run the smoke runner without `--claim`, then with `--claim` against a
   disposable staging task.
5. Verify heartbeat, claim, stale requeue, new-generation claim, stale
   completion rejection, revocation, expiry, and rotation.

Example shape (placeholders only):

```powershell
python worker/provision_worker_identity.py <WORKER_ID> `
  --store C:\ProgramData\CWS\worker-credential.dpapi `
  --sql-out C:\ProgramData\CWS\worker-identity-hash.sql
python worker/staging_identity_smoke.py `
  --base-url https://<STAGING_BACKEND> `
  --worker-id <WORKER_ID> `
  --credential-store C:\ProgramData\CWS\worker-credential.dpapi
```

The helper must run as the same least-privilege account as the Worker
service. Windows ACL/service installation and physical failover are runtime
gates, not simulated here.

## Verification boundary

CODE/UNIT VERIFIED. Backend worker-auth/RPC tests: 9/9 PASS. Provisioning
tests: 2/2 PASS. Smoke-runner guard and Python compilation PASS. Migration
application, staging credentials, Windows ACL/DPAPI behavior, physical
Worker failover, B2, payment, and production RPC runtime remain unverified.
No production mutation was performed.
