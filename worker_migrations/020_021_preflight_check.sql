-- READ-ONLY preflight for Worker identity + failover migrations.
-- Run in Supabase SQL Editor/psql before applying 020 then 021.
-- It does not create, alter, update, revoke or delete anything.

set local statement_timeout = '30s';

do $$
begin
  if to_regclass('public.workers') is null
     or to_regclass('public.jobs') is null
     or to_regclass('public.tasks') is null
     or to_regclass('public.task_attempts') is null then
    raise exception 'CWS preflight blocked: base Worker tables are missing';
  end if;
end $$;

with checks(name, ok, detail) as (
  values
    ('workers table', to_regclass('public.workers') is not null, 'required by identity FK'),
    ('jobs table', to_regclass('public.jobs') is not null, 'required by retry policy'),
    ('tasks table', to_regclass('public.tasks') is not null, 'required by lease fencing'),
    ('task_attempts table', to_regclass('public.task_attempts') is not null, 'required by attempt history'),
    ('tasks.generation', exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='generation'), 'fencing token'),
    ('tasks.last_heartbeat', exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='last_heartbeat'), 'stale lease detector'),
    ('tasks.retry_count', exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='retry_count'), 'bounded retry counter'),
    ('tasks.failed_by', exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='failed_by'), 'failed-worker avoidance')
)
select name, case when ok then 'PASS' else 'BLOCKED' end as status, detail
from checks
order by name;

select 'WARNING' as status, 'active tasks with null heartbeat are not requeued by the migration; inspect before apply' as detail,
       count(*) as affected_rows
from public.tasks
where status = 'active' and last_heartbeat is null;

select 'INFO' as status,
       'max_retry_attempts is additive and absent before migration 021; existing jobs receive the non-destructive default 3' as detail;
