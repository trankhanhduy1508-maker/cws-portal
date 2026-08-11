-- Canonical fenced metadata report for the first real render Task.
-- Additive: historical Jobs retain NULL metadata until a real owned Task
-- reports it. No Task Graph expansion is performed by this migration.

alter table public.jobs
  add column if not exists frame_start integer,
  add column if not exists frame_end integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_frame_interval_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_frame_interval_check
      check (
        (frame_start is null and frame_end is null)
        or (frame_start is not null and frame_end is not null and frame_end >= frame_start)
      );
  end if;
end $$;

create or replace function public.report_job_metadata(
  p_task_id bigint,
  p_generation integer,
  p_worker_id text,
  p_frame_start integer,
  p_frame_end integer,
  p_total_frames integer,
  p_fps numeric
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_job_id text;
  v_existing_start integer;
  v_existing_end integer;
  v_existing_total integer;
  v_existing_fps numeric;
begin
  if p_task_id is null
     or p_generation is null
     or p_worker_id is null
     or btrim(p_worker_id) = ''
     or p_frame_start is null
     or p_frame_end is null
     or p_total_frames is null
     or p_fps is null then
    return false;
  end if;

  if p_frame_start < 0
     or p_frame_end < p_frame_start
     or p_total_frames <> (p_frame_end - p_frame_start + 1)
     or p_total_frames < 1
     or p_fps <= 0
     or p_fps > 1000 then
    return false;
  end if;

  select t.job_id into v_job_id
  from public.tasks t
  where t.id = p_task_id
    and t.worker_id = p_worker_id
    and t.generation = p_generation
    and t.status = 'active'
  for update;

  if not found then return false; end if;

  select j.frame_start, j.frame_end, j.total_frames, j.fps
    into v_existing_start, v_existing_end, v_existing_total, v_existing_fps
  from public.jobs j
  where j.id = v_job_id
  for update;

  if not found then return false; end if;

  if v_existing_start is not null
     or v_existing_end is not null
     or v_existing_total is not null then
    return v_existing_start = p_frame_start
       and v_existing_end = p_frame_end
       and v_existing_total = p_total_frames
       and v_existing_fps = p_fps;
  end if;

  update public.jobs
  set frame_start = p_frame_start,
      frame_end = p_frame_end,
      total_frames = p_total_frames,
      fps = p_fps,
      chunking_status = 'probing'
  where id = v_job_id;

  return true;
end;
$function$;

revoke all on function public.report_job_metadata(bigint, integer, text, integer, integer, integer, numeric)
  from public, anon, authenticated;
grant execute on function public.report_job_metadata(bigint, integer, text, integer, integer, integer, numeric)
  to service_role;

comment on function public.report_job_metadata(bigint, integer, text, integer, integer, integer, numeric) is
  'First real render Task reports fenced Blender frame interval and FPS. First valid metadata wins; identical retries are idempotent; stale, unrelated or conflicting reports are rejected. This migration does not expand the Task Graph.';
