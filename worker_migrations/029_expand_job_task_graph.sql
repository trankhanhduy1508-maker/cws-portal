Exit code: 0
Wall time: 1.4 seconds
Output:
-- Spec 008: expand the durable render Task graph at first authoritative
-- metadata report. This is additive and preserves claim/lease/generation
-- fencing; it does not add a queue or change Worker ownership.

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
  v_cursor integer;
  v_next_end integer;
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
     or p_total_frames <> p_frame_end - p_frame_start + 1
     or p_total_frames < 1
     or p_fps <= 0
     or p_fps > 1000 then
    return false;
  end if;

  -- Lock the authoritative active Task first. This preserves the existing
  -- Worker/task/generation fence for metadata and seed reconciliation.
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

  -- Serialize metadata retries and all graph expansion for this Job.
  select j.frame_start, j.frame_end, j.total_frames, j.fps, j.chunking_status
    into v_job_start, v_job_end, v_job_total, v_job_fps, v_chunking_status
  from public.jobs j
  where j.id = v_job_id
  for update;

  if not found then
    return false;
  end if;

  if (v_job_start is null) <> (v_job_end is null) then
    return false;
  end if;

  -- Complete metadata is immutable except for an identical retry. A retry
  -- after a committed expansion is a no-op; the Job lock makes this safe
  -- against concurrent Scheduler/Worker calls.
  if v_job_start is not null and v_job_end is not null then
    if v_job_total is null
       or v_job_total <> v_job_end - v_job_start + 1
       or v_job_start <> p_frame_start
       or v_job_end <> p_frame_end
       or v_job_total <> p_total_frames
       or v_job_fps <> p_fps then
      return false;
    end if;

    if v_chunking_status = 'chunked' then
      return true;
    end if;
  end if;

  -- Historical total-only metadata may be completed only when the incoming
  -- authoritative total agrees. Never infer a missing frame_start.
  if v_job_total is not null and v_job_total <> p_total_frames then
    return false;
  end if;

  -- Only the original sole [1,1] seed, or the same seed already reconciled
  -- by the predecessor metadata migration, may trigger graph expansion.
  -- Ordinary Tasks are never rewritten or used to create a graph.
  v_bootstrap :=
    v_task_count = 1
    and v_chunking_status in ('pending', 'probing')
    and (
      (v_task_start = 1 and v_task_end = 1)
      or (v_task_start = p_frame_start and v_task_end = p_frame_start)
    );

  update public.jobs
  set frame_start = p_frame_start,
      frame_end = p_frame_end,
      total_frames = p_total_frames,
      fps = p_fps,
      chunking_status = case when v_bootstrap then 'probing' else chunking_status end
  where id = v_job_id;

  if not v_bootstrap then
    return true;
  end if;

  -- Preserve the seed Task identity, owner, generation, lease and active
  -- state. Only its authoritative first-frame coverage is reconciled.
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

  -- The seed must be the sole pre-expansion Task. This fail-closed check is
  -- what prevents a retry or concurrent caller from creating duplicate
  -- coverage under a different Task ID.
  select count(*) into v_task_count
  from public.tasks t
  where t.job_id = v_job_id;
  if v_task_count <> 1 then
    return false;
  end if;

  -- Deterministic disjoint partition. The existing CWS chunk convention is
  -- 10 frames; the first real Task is [S,S], then [S+1,E] is covered once.
  v_cursor := p_frame_start + 1;
  while v_cursor <= p_frame_end loop
    v_next_end := least(v_cursor + 9, p_frame_end);
    insert into public.tasks(job_id, frame_start, frame_end, status)
    values (v_job_id, v_cursor, v_next_end, 'queued');
    v_cursor := v_next_end + 1;
  end loop;

  update public.jobs
  set chunking_status = 'chunked'
  where id = v_job_id;

  return true;
end;
$function$;

revoke all on function public.report_job_metadata(bigint, integer, text, integer, integer, integer, numeric)
  from public, anon, authenticated;
grant execute on function public.report_job_metadata(bigint, integer, text, integer, integer, integer, numeric)
  to service_role;

comment on function public.report_job_metadata(bigint, integer, text, integer, integer, integer, numeric) is
  'Fenced first-task metadata report with immediate durable disjoint Task Graph expansion. The sole seed becomes [S,S], remaining ranges use the existing 10-frame convention, and retries are idempotent under the Job row lock.';

