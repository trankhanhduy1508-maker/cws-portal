-- Canonical fenced metadata report for the first real render Task.
-- Additive: historical Jobs retain partial/NULL metadata safely. This
-- migration does not create remaining Task Graph ranges.

alter table public.jobs
  add column if not exists frame_start integer,
  add column if not exists frame_end integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
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

  if not exists (
    select 1 from pg_constraint
    where conname = 'jobs_frame_metadata_consistency_check'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_frame_metadata_consistency_check
      check (
        (frame_start is null and frame_end is null)
        or (
          frame_start is not null
          and frame_end is not null
          and total_frames is not null
          and total_frames = frame_end - frame_start + 1
        )
      ) not valid;
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
  v_task_start integer;
  v_task_end integer;
  v_task_count integer;
  v_job_start integer;
  v_job_end integer;
  v_job_total integer;
  v_job_fps numeric;
  v_chunking_status text;
  v_bootstrap boolean;
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

  -- CWS JobSpec and Blender preflight currently use non-negative frame
  -- numbers. This is an explicit product contract, not an assumption that
  -- every Blender installation uses frame 1.
  if p_frame_start < 0
     or p_frame_end < p_frame_start
     or p_total_frames <> (p_frame_end - p_frame_start + 1)
     or p_total_frames < 1
     or p_fps <= 0
     or p_fps > 1000 then
    return false;
  end if;

  -- Lock the authoritative active Task first. This is the Worker/task/
  -- generation fence for both metadata and bootstrap reconciliation.
  select t.job_id, t.frame_start, t.frame_end
    into v_job_id, v_task_start, v_task_end
  from public.tasks t
  where t.id = p_task_id
    and t.worker_id = p_worker_id
    and t.generation = p_generation
    and t.status = 'active'
  for update;

  if not found then
    return false;
  end if;

  select count(*) into v_task_count
  from public.tasks t
  where t.job_id = v_job_id;

  -- Lock the Job after the Task so concurrent metadata reporters serialize.
  select j.frame_start, j.frame_end, j.total_frames, j.fps, j.chunking_status
    into v_job_start, v_job_end, v_job_total, v_job_fps, v_chunking_status
  from public.jobs j
  where j.id = v_job_id
  for update;

  if not found then
    return false;
  end if;

  -- A single existing bound is malformed partial state. Never guess it.
  if (v_job_start is null) <> (v_job_end is null) then
    return false;
  end if;

  -- Complete authoritative metadata is immutable except for an identical
  -- retry. The default jobs.fps value alone is not treated as proof.
  if v_job_start is not null and v_job_end is not null then
    if v_job_total is null
       or v_job_total <> v_job_end - v_job_start + 1 then
      return false;
    end if;
    return v_job_start = p_frame_start
       and v_job_end = p_frame_end
       and v_job_total = p_total_frames
       and v_job_fps = p_fps;
  end if;

  -- A historical total_frames-only row may be completed only when the real
  -- report agrees. A conflicting value is never overwritten.
  if v_job_total is not null and v_job_total <> p_total_frames then
    return false;
  end if;

  -- The original [1,1] row is a bootstrap seed only when it is the sole
  -- Task for the Job and no authoritative bounds exist. Ordinary Tasks are
  -- never rewritten as bootstrap Tasks.
  v_bootstrap :=
    v_task_start = 1
    and v_task_end = 1
    and v_task_count = 1
    and coalesce(v_chunking_status, 'pending') in ('pending', 'probing');

  update public.jobs
  set frame_start = p_frame_start,
      frame_end = p_frame_end,
      total_frames = p_total_frames,
      fps = p_fps,
      chunking_status = 'probing'
  where id = v_job_id;

  if v_bootstrap then
    -- Preserve Task identity, owner, generation, lease and active status.
    -- Only its first real frame coverage changes from seed [1,1] to [S,S].
    update public.tasks
    set frame_start = p_frame_start,
        frame_end = p_frame_start
    where id = p_task_id
      and worker_id = p_worker_id
      and generation = p_generation
      and status = 'active';
    if not found then
      return false;
    end if;
  end if;

  return true;
end;
$function$;

revoke all on function public.report_job_metadata(bigint, integer, text, integer, integer, integer, numeric)
  from public, anon, authenticated;
grant execute on function public.report_job_metadata(bigint, integer, text, integer, integer, integer, numeric)
  to service_role;

comment on function public.report_job_metadata(bigint, integer, text, integer, integer, integer, numeric) is
  'Fenced first-task metadata report. The sole bootstrap [1,1] Task is atomically reconciled to [S,S]; historical total-only metadata is completed only on matching total; complete metadata is immutable/idempotent. No remaining Task Graph expansion.';
