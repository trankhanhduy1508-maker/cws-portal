-- Production dynamic JobSpec bridge for the canonical Node Agent.
-- Apply only after 020/021 and after reviewing the production schema.
-- This function is read-only with respect to task state and is fenced by the
-- current task owner and generation. It returns no spec for stale attempts.

set lock_timeout = '5s';
set statement_timeout = '30s';

drop function if exists public.get_claimed_task_spec(bigint, integer, text);

create or replace function public.get_claimed_task_spec(
  p_task_id bigint,
  p_generation integer,
  p_worker_id text
)
returns table(
  job_id text,
  task_id text,
  attempt_id text,
  lease_generation integer,
  project_uri text,
  frame_start integer,
  frame_end integer,
  output_prefix text,
  output_format text,
  autoexec boolean,
  required_vram_mb integer,
  required_ram_mb integer
)
language sql
security definer
set search_path = public, pg_temp
as $function$
  select
    j.id::text,
    t.id::text,
    ta.id::text,
    t.generation,
    nullif(btrim(j.blend_link), ''),
    t.frame_start,
    t.frame_end,
    'renders/' || j.id::text,
    'png',
    false,
    greatest(coalesce(t.min_vram_mb, 0), 0),
    0
  from public.tasks t
  join public.jobs j on j.id = t.job_id
  join lateral (
    select a.id
    from public.task_attempts a
    where a.task_id = t.id
      and a.worker_id = p_worker_id
      and a.lease_generation = t.generation
      and a.status in ('assigned', 'in_progress')
    order by a.id desc
    limit 1
  ) ta on true
  where t.id = p_task_id
    and t.generation = p_generation
    and t.worker_id = p_worker_id
    and t.status = 'active'
    and nullif(btrim(j.blend_link), '') is not null;
$function$;

revoke all on function public.get_claimed_task_spec(bigint, integer, text)
  from public, anon, authenticated;

comment on function public.get_claimed_task_spec(bigint, integer, text) is
  'Read-only fenced dynamic JobSpec bridge for the authenticated Node Agent.';

-- Rollback:
-- drop function if exists public.get_claimed_task_spec(bigint, integer, text);
