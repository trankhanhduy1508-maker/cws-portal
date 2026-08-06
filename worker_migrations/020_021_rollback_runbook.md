# Worker identity/failover rollback runbook

This is a manual rollback plan. It is not executed by the application and
must be reviewed against the live catalog before use.

1. Stop the Worker gateway deployment or route traffic away from
   `claim_next_resilient_task`.
2. Re-run the previously approved canonical definitions from migrations
   `000_worker_fleet_base_schema.sql`, `005_requeue_incident_visibility.sql`
   and `006_host_usage_billing.sql` in their original dependency order. This
   restores the prior `report_heartbeat` and `requeue_stale_tasks` functions.
3. Drop only the additive resilient function and constraint/column after no
   active call depends on them:

```sql
drop function if exists public.claim_next_resilient_task(text, integer);
alter table public.jobs drop constraint if exists jobs_max_retry_attempts_check;
alter table public.jobs drop column if exists max_retry_attempts;
```

4. Do not drop `worker_identities` or `worker_auth_nonces` as part of an
   incident rollback; revocation is safer than deleting identity audit data.
   Remove migration 020 only through a separate approved security change.

No rollback was run against staging or production by Codex.
