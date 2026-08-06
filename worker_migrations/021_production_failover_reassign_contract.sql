-- Production failover/reassign contract, additive and fail-closed.
-- Apply only through the approved Supabase migration process.
--
-- The existing tasks.generation remains the fencing token. A stale attempt
-- can be requeued, but it can never complete or update progress afterwards.

-- Fail closed rather than waiting behind a long-running production query.
set lock_timeout = '5s';
set statement_timeout = '30s';

alter table public.jobs
  add column if not exists max_retry_attempts integer not null default 3;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.jobs'::regclass
      and c.conname = 'jobs_max_retry_attempts_check'
  ) then
    alter table public.jobs
      add constraint jobs_max_retry_attempts_check
      check (max_retry_attempts between 1 and 10) not valid;
  end if;
end $$;

create index if not exists idx_tasks_failover_queue
  on public.tasks (status, retry_count, id)
  where status = 'queued';

-- Active render heartbeat refreshes both the task lease and Worker presence.
-- A stale/incorrect generation is rejected and cannot revive a dead lease.
create or replace function public.report_heartbeat(
  p_task_id bigint, p_generation integer, p_worker_id text
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_count integer;
begin
  update public.tasks
  set last_heartbeat = now()
  where id = p_task_id
    and generation = p_generation
    and worker_id = p_worker_id
    and status = 'active';
  get diagnostics v_count = row_count;

  if v_count > 0 then
    update public.workers
    set last_seen_at = now(), status = case when status = 'offline' then 'busy' else status end,
        current_task_id = p_task_id, current_generation = p_generation
    where worker_id = p_worker_id;
  end if;
  return v_count > 0;
end;
$function$;

-- Canonical production pull claim. The authenticated backend gateway injects
-- p_worker_id; clients must not call this RPC directly with a publishable key.
create or replace function public.claim_next_resilient_task(
  p_worker_id text,
  p_worker_vram_mb integer default null
)
returns table(
  task_id bigint,
  job_id text,
  frame_start integer,
  frame_end integer,
  lease_generation integer,
  attempt_id bigint
)
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_task_id bigint;
  v_job_id text;
  v_frame_start integer;
  v_frame_end integer;
  v_generation integer;
  v_attempt_id bigint;
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then return; end if;

  if not exists (
    select 1 from public.workers w
    where w.worker_id = p_worker_id
      and w.status <> 'offline'
      and w.last_seen_at >= now() - interval '180 seconds'
      and coalesce(w.health_state, 'OK') not in ('QUARANTINED', 'DEGRADED')
      and coalesce(w.desired_state, '') <> 'DRAINING'
  ) then return; end if;

  select t.id, t.job_id, t.frame_start, t.frame_end, t.generation
    into v_task_id, v_job_id, v_frame_start, v_frame_end, v_generation
  from public.tasks t
  join public.jobs j on j.id = t.job_id
  where t.status = 'queued'
    and j.status in ('queued', 'active')
    and (t.min_vram_mb is null or (p_worker_vram_mb is not null and t.min_vram_mb <= p_worker_vram_mb))
    and not (p_worker_id = any(coalesce(t.failed_by, '{}'::text[])))
  order by coalesce(j.priority, 999), t.retry_count, t.id
  limit 1
  for update of t skip locked;

  if v_task_id is null then return; end if;

  update public.tasks
  set status = 'active', worker_id = p_worker_id,
      claimed_at = now(), last_heartbeat = now()
  where id = v_task_id and status = 'queued';

  insert into public.task_attempts(task_id, worker_id, lease_generation, assigned_at, status)
  values (v_task_id, p_worker_id, v_generation, now(), 'in_progress')
  returning id into v_attempt_id;

  update public.workers
  set status = 'busy', last_seen_at = now(),
      current_task_id = v_task_id, current_generation = v_generation
  where worker_id = p_worker_id;

  return query select v_task_id, v_job_id, v_frame_start, v_frame_end, v_generation, v_attempt_id;
end;
$function$;

-- Stale active tasks are fenced, recorded against the failed Worker, and
-- requeued only within the Job's bounded retry budget. Once exhausted, the
-- task becomes an explicit failure instead of entering an infinite retry loop.
create or replace function public.requeue_stale_tasks()
returns integer
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_count integer := 0;
  v_row record;
  v_next_retry integer;
begin
  for v_row in
    select t.id, t.worker_id, t.generation, t.retry_count,
           coalesce(j.max_retry_attempts, 3) as max_retry_attempts
    from public.tasks t
    join public.jobs j on j.id = t.job_id
    where t.status = 'active'
      and t.last_heartbeat < now() - interval '240 seconds'
    for update of t skip locked
  loop
    v_next_retry := v_row.retry_count + 1;
    update public.tasks
    set status = case when v_next_retry >= v_row.max_retry_attempts then 'failed' else 'queued' end,
        worker_id = null, claimed_at = null, last_heartbeat = null,
        retry_count = v_next_retry,
        failed_by = case when v_row.worker_id is null then failed_by
                         else array_append(coalesce(failed_by, '{}'::text[]), v_row.worker_id) end,
        error_category = case when v_next_retry >= v_row.max_retry_attempts then 'transient' else null end,
        generation = generation + 1,
        last_log = case when v_next_retry >= v_row.max_retry_attempts
                        then left(format('Failover retry budget exhausted after %s attempts', v_next_retry), 500)
                        else left('Worker lease expired; task requeued for failover', 500) end,
        log_updated_at = now()
    where id = v_row.id and status = 'active';

    if found then
      v_count := v_count + 1;
      update public.task_attempts
      set status = case when v_next_retry >= v_row.max_retry_attempts then 'failed' else 'superseded' end,
          failure_reason = case when v_next_retry >= v_row.max_retry_attempts
                                then 'retry_budget_exhausted' else 'stale_heartbeat' end
      where task_id = v_row.id and worker_id = v_row.worker_id
        and lease_generation = v_row.generation
        and status in ('assigned', 'in_progress');

      if v_row.worker_id is not null then
        update public.workers
        set current_task_id = null, current_generation = null,
            status = case when status = 'busy' then 'offline' else status end
        where worker_id = v_row.worker_id and current_task_id = v_row.id;
      end if;
    end if;
  end loop;
  return v_count;
end;
$function$;

revoke all on function public.claim_next_resilient_task(text, integer) from public, anon, authenticated;
revoke all on function public.requeue_stale_tasks() from public, anon, authenticated;
revoke all on function public.report_heartbeat(bigint, integer, text) from public, anon, authenticated;

comment on function public.claim_next_resilient_task(text, integer) is
  'Production pull claim: fresh healthy Worker only, capability check, failed-worker avoidance, task attempt creation, and generation fencing.';
comment on function public.requeue_stale_tasks() is
  'Bounded stale-lease failover. Increments generation, records the failed Worker, supersedes the old attempt, and stops after max_retry_attempts.';

-- Rollback (manual, only after reviewing live dependencies):
-- drop function if exists public.claim_next_resilient_task(text, integer);
-- rerun the prior canonical definitions from migrations 000/005/006;
-- alter table public.jobs drop constraint if exists jobs_max_retry_attempts_check;
-- alter table public.jobs drop column if exists max_retry_attempts;
