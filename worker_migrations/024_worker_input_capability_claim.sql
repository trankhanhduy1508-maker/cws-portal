-- Match queued tasks to input transports the authenticated Worker can
-- actually consume. This prevents a B2-only Worker from claiming historical
-- Google Drive work and burning the bounded retry budget.
set lock_timeout = '5s';
set statement_timeout = '30s';

create or replace function public.claim_next_resilient_task(
  p_worker_id text,
  p_worker_vram_mb integer,
  p_supported_input_schemes text[]
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
  if p_supported_input_schemes is null
     or cardinality(p_supported_input_schemes) = 0
     or p_supported_input_schemes <@ array['b2', 'google_drive']::text[] is not true
  then return; end if;

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
    and (
      ('b2' = any(p_supported_input_schemes) and lower(j.blend_link) like 'b2://%')
      or (
        'google_drive' = any(p_supported_input_schemes)
        and lower(j.blend_link) ~ '^https://(drive\.google\.com|www\.googleapis\.com)/'
      )
    )
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

revoke all on function public.claim_next_resilient_task(text, integer, text[])
  from public, anon, authenticated;
grant execute on function public.claim_next_resilient_task(text, integer, text[])
  to service_role;

comment on function public.claim_next_resilient_task(text, integer, text[]) is
  'Atomic fenced claim filtered by authenticated Worker input capabilities.';

-- Rollback: Backend and Node Agent must be rolled back together before:
-- drop function if exists public.claim_next_resilient_task(text, integer, text[]);
