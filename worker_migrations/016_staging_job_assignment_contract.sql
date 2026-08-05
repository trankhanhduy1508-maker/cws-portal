-- P0 staging-only assignment contract for the generic Worker Engine.
--
-- Apply after worker_migrations/001_worker_state_machine_schema.sql and
-- worker_migrations/014_claim_next_generic_mvp_task.sql in a SEPARATE
-- Supabase staging project. Existing production jobs are never eligible:
-- the new RPC requires jobs.staging_enabled = true.
--
-- This migration is additive. It does not alter the legacy claim RPC and it
-- does not infer project/output data from legacy production columns.

alter table public.jobs
  add column if not exists staging_enabled boolean not null default false,
  add column if not exists project_uri text,
  add column if not exists output_prefix text,
  add column if not exists output_format text,
  add column if not exists autoexec boolean not null default false,
  add column if not exists required_vram_mb integer not null default 0,
  add column if not exists required_ram_mb integer not null default 0;

alter table public.tasks
  add column if not exists required_ram_mb integer not null default 0;

create index if not exists idx_tasks_staging_queued
  on public.tasks (claimed_at nulls first, id)
  where status = 'queued';

drop function if exists public.claim_next_staging_job(text, integer);

create or replace function public.claim_next_staging_job(
  p_worker_id text,
  p_worker_vram_mb integer default null::integer
)
returns table(
  job_id text,
  task_id bigint,
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
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_task_id bigint;
  v_attempt_id bigint;
  v_generation integer;
  v_job_id text;
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then
    return;
  end if;

  if not exists (
    select 1 from public.workers w where w.worker_id = p_worker_id
  ) then
    return;
  end if;

  if exists (
    select 1 from public.workers w
    where w.worker_id = p_worker_id
      and (w.health_state = 'QUARANTINED' or w.desired_state = 'DRAINING')
  ) then
    return;
  end if;

  select t.id, t.generation, t.job_id
    into v_task_id, v_generation, v_job_id
  from public.tasks t
  join public.jobs j on j.id = t.job_id
  where t.status = 'queued'
    and j.staging_enabled = true
    and j.project_uri is not null
    and btrim(j.project_uri) <> ''
    and j.output_prefix is not null
    and btrim(j.output_prefix) <> ''
    and j.output_format is not null
    and j.output_format ~ '^[a-z0-9]{1,8}$'
    and j.autoexec = false
    and j.required_vram_mb >= 0
    and j.required_ram_mb >= 0
    and coalesce(t.required_ram_mb, 0) >= 0
    and t.frame_start >= 0
    and t.frame_end >= t.frame_start
    and (t.min_vram_mb is null
         or (p_worker_vram_mb is not null and t.min_vram_mb <= p_worker_vram_mb))
  order by t.claimed_at nulls first, t.id
  limit 1
  for update of t skip locked;

  if v_task_id is null then
    return;
  end if;

  update public.tasks
  set status = 'active', worker_id = p_worker_id,
      claimed_at = now(), last_heartbeat = now()
  where id = v_task_id;

  insert into public.task_attempts (
    task_id, worker_id, lease_generation, assigned_at, status
  ) values (
    v_task_id, p_worker_id, v_generation, now(), 'assigned'
  ) returning id into v_attempt_id;

  update public.workers
  set status = 'busy', last_seen_at = now(),
      current_task_id = v_task_id, current_generation = v_generation
  where worker_id = p_worker_id;

  return query
  select j.id::text,
         t.id,
         v_attempt_id::text,
         t.generation,
         j.project_uri,
         t.frame_start,
         t.frame_end,
         j.output_prefix,
         lower(j.output_format),
         j.autoexec,
         greatest(coalesce(t.min_vram_mb, 0), j.required_vram_mb),
         greatest(coalesce(t.required_ram_mb, 0), j.required_ram_mb)
  from public.tasks t
  join public.jobs j on j.id = t.job_id
  where t.id = v_task_id;
end;
$function$;

comment on function public.claim_next_staging_job(text, integer) is
  'P0 staging-only generic assignment. Claims only jobs explicitly marked staging_enabled and returns the complete JobSpec contract. It never falls back to legacy production fields or enables customer autoexec.';

revoke all on function public.claim_next_staging_job(text, integer) from public;
grant execute on function public.claim_next_staging_job(text, integer) to anon, authenticated;

-- Rollback (staging only; run manually if required):
-- revoke all on function public.claim_next_staging_job(text, integer) from anon, authenticated;
-- drop function if exists public.claim_next_staging_job(text, integer);
-- drop index if exists public.idx_tasks_staging_queued;
-- alter table public.tasks drop column if exists required_ram_mb;
-- alter table public.jobs
--   drop column if exists staging_enabled,
--   drop column if exists project_uri,
--   drop column if exists output_prefix,
--   drop column if exists output_format,
--   drop column if exists autoexec,
--   drop column if exists required_vram_mb,
--   drop column if exists required_ram_mb;
