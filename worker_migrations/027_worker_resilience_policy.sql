-- CWS Worker resilience policy, additive and fail-closed.
--
-- This migration does not replace the scheduler. PostgreSQL claim, task
-- generation fencing, lease expiry and the existing bounded retry budget stay
-- authoritative. The authenticated Backend gateway is the only caller.
set lock_timeout = '5s';
set statement_timeout = '30s';

create or replace function public.report_worker_failure(
  p_task_id bigint,
  p_generation integer,
  p_worker_id text,
  p_failure_category text,
  p_summary text default null
) returns text
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_job_id text;
  v_retry_count integer;
  v_max_retry_attempts integer;
  v_next_retry integer;
  v_incident_count integer;
  v_task_outcome text;
  v_task_status text;
begin
  if p_failure_category is null or p_failure_category not in (
    'CUSTOMER_INPUT_ERROR', 'CAPABILITY_MISMATCH', 'BLENDER_RENDER_ERROR',
    'WORKER_HOST_ERROR', 'STORAGE_TRANSIENT', 'BACKEND_TRANSIENT',
    'NETWORK_TRANSIENT', 'SECURITY_VIOLATION'
  ) then
    return 'rejected';
  end if;

  select t.job_id, t.retry_count, coalesce(j.max_retry_attempts, 3)
    into v_job_id, v_retry_count, v_max_retry_attempts
  from public.tasks t
  join public.jobs j on j.id = t.job_id
  where t.id = p_task_id
    and t.generation = p_generation
    and t.worker_id = p_worker_id
    and t.status = 'active'
  for update of t;

  if not found then
    return 'rejected';
  end if;

  -- Serialize the health score for one Worker. Customer/input and transport
  -- failures never enter this branch and therefore cannot poison the Worker.
  perform 1 from public.workers where worker_id = p_worker_id for update;
  if p_failure_category in ('BLENDER_RENDER_ERROR', 'WORKER_HOST_ERROR', 'SECURITY_VIOLATION') then
    perform public.report_worker_incident(
      p_worker_id => p_worker_id,
      p_task_id => p_task_id,
      p_event_type => 'WORKER_RESILIENCE_FAILURE',
      p_severity => case when p_failure_category = 'SECURITY_VIOLATION' then 'critical' else 'error' end,
      p_error_code => p_failure_category,
      p_summary => left(coalesce(p_summary, p_failure_category), 500),
      p_details => jsonb_build_object('category', p_failure_category)
    );

    select occurrence_count into v_incident_count
    from public.worker_incidents
    where worker_id = p_worker_id
      and event_type = 'WORKER_RESILIENCE_FAILURE'
      and error_code = p_failure_category
      and resolved_at is null
    order by last_seen_at desc
    limit 1;

    update public.workers
    set health_state = case
      when p_failure_category = 'SECURITY_VIOLATION' then 'QUARANTINED'
      when coalesce(v_incident_count, 0) >= 5 then 'QUARANTINED'
      when coalesce(v_incident_count, 0) >= 3 then 'DEGRADED'
      else coalesce(health_state, 'OK')
    end,
        state_reason = left(coalesce(p_summary, p_failure_category), 240),
        last_transition_at = case
          when p_failure_category = 'SECURITY_VIOLATION'
            or coalesce(v_incident_count, 0) in (3, 5) then now()
          else last_transition_at
        end
    where worker_id = p_worker_id;
  end if;

  v_next_retry := v_retry_count + 1;
  if p_failure_category in ('CUSTOMER_INPUT_ERROR', 'SECURITY_VIOLATION') then
    v_task_status := 'failed';
  elsif v_next_retry >= v_max_retry_attempts then
    v_task_status := 'failed';
  else
    v_task_status := 'queued';
  end if;

  update public.tasks
  set status = v_task_status,
      worker_id = null,
      claimed_at = null,
      last_heartbeat = null,
      retry_count = case
        when p_failure_category in ('CUSTOMER_INPUT_ERROR', 'SECURITY_VIOLATION') then retry_count
        else v_next_retry
      end,
      failed_by = case
        when p_failure_category in ('CAPABILITY_MISMATCH', 'BLENDER_RENDER_ERROR', 'WORKER_HOST_ERROR', 'SECURITY_VIOLATION')
          then array_append(coalesce(failed_by, '{}'::text[]), p_worker_id)
        else failed_by
      end,
      error_category = case when v_task_status = 'failed'
        then case when p_failure_category in ('STORAGE_TRANSIENT', 'BACKEND_TRANSIENT', 'NETWORK_TRANSIENT', 'BLENDER_RENDER_ERROR', 'WORKER_HOST_ERROR', 'CAPABILITY_MISMATCH') then 'transient' else 'permanent' end
        else null end,
      generation = generation + 1,
      last_log = left(coalesce(p_summary, p_failure_category), 500),
      log_updated_at = now()
  where id = p_task_id and status = 'active' and generation = p_generation;

  if not found then
    return 'rejected';
  end if;

  update public.task_attempts
  set status = case when v_task_status = 'failed' then 'failed' else 'superseded' end,
      failure_reason = p_failure_category
  where task_id = p_task_id and worker_id = p_worker_id
    and lease_generation = p_generation
    and status in ('assigned', 'in_progress');

  update public.workers
  set current_task_id = null, current_generation = null,
      status = 'idle', last_seen_at = now()
  where worker_id = p_worker_id and current_task_id = p_task_id;

  return case when v_task_status = 'queued' then 'requeued' else 'permanent' end;
end;
$function$;

create or replace function public.report_worker_probe(
  p_worker_id text,
  p_probe_state text,
  p_reason text default null
) returns text
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_health_state text;
  v_security_incident boolean;
begin
  if p_probe_state not in ('PROBING', 'OK', 'FAILED') then
    return 'rejected';
  end if;

  select health_state into v_health_state
  from public.workers where worker_id = p_worker_id for update;
  if not found then return 'rejected'; end if;

  select exists (
    select 1 from public.worker_incidents
    where worker_id = p_worker_id
      and error_code = 'SECURITY_VIOLATION'
      and resolved_at is null
  ) into v_security_incident;

  if v_security_incident then
    update public.workers
    set health_state = 'QUARANTINED',
        state_reason = 'security incident requires explicit review',
        last_transition_at = now()
    where worker_id = p_worker_id;
    return 'blocked';
  end if;

  if p_probe_state = 'PROBING' then
    update public.workers
    set health_state = 'PROBING',
        state_reason = left(coalesce(p_reason, 'health probe started'), 240),
        last_transition_at = now()
    where worker_id = p_worker_id;
    return 'probing';
  end if;

  if p_probe_state = 'OK' then
    update public.workers
    set health_state = 'OK',
        state_reason = left(coalesce(p_reason, 'health probe passed'), 240),
        last_transition_at = now()
    where worker_id = p_worker_id;
    update public.worker_incidents
    set resolved_at = now(), resolution = 'automatic_probe_passed'
    where worker_id = p_worker_id
      and event_type = 'WORKER_RESILIENCE_FAILURE'
      and error_code in ('BLENDER_RENDER_ERROR', 'WORKER_HOST_ERROR', 'WORKER_PROBE_FAILED')
      and resolved_at is null;
    return 'healthy';
  end if;

  perform public.report_worker_incident(
    p_worker_id => p_worker_id,
    p_task_id => null,
    p_event_type => 'WORKER_RESILIENCE_FAILURE',
    p_severity => 'error',
    p_error_code => 'WORKER_PROBE_FAILED',
    p_summary => left(coalesce(p_reason, 'health probe failed'), 500),
    p_details => jsonb_build_object('category', 'WORKER_HOST_ERROR')
  );
  update public.workers
  set health_state = 'QUARANTINED',
      state_reason = left(coalesce(p_reason, 'health probe failed'), 240),
      last_transition_at = now()
  where worker_id = p_worker_id;
  return 'quarantined';
end;
$function$;

-- Preserve the latest capability-aware claim signature and add PROBING to the
-- existing health exclusion. The claim remains atomic PostgreSQL ownership.
create or replace function public.claim_next_resilient_task(
  p_worker_id text,
  p_worker_vram_mb integer,
  p_supported_input_schemes text[]
)
returns table(task_id bigint, job_id text, frame_start integer, frame_end integer,
              lease_generation integer, attempt_id bigint)
language plpgsql security definer
set search_path = public, pg_temp
as $function$
declare
  v_task_id bigint; v_job_id text; v_frame_start integer; v_frame_end integer;
  v_generation integer; v_attempt_id bigint;
begin
  if p_worker_id is null or btrim(p_worker_id) = '' then return; end if;
  if p_supported_input_schemes is null or cardinality(p_supported_input_schemes) = 0
     or p_supported_input_schemes <@ array['b2', 'google_drive']::text[] is not true then return; end if;
  if not exists (
    select 1 from public.workers w
    where w.worker_id = p_worker_id and w.status <> 'offline'
      and w.last_seen_at >= now() - interval '180 seconds'
      and coalesce(w.health_state, 'OK') not in ('QUARANTINED', 'DEGRADED', 'PROBING')
      and coalesce(w.desired_state, '') <> 'DRAINING'
  ) then return; end if;
  select t.id, t.job_id, t.frame_start, t.frame_end, t.generation
    into v_task_id, v_job_id, v_frame_start, v_frame_end, v_generation
  from public.tasks t join public.jobs j on j.id = t.job_id
  where t.status = 'queued' and j.status in ('queued', 'active')
    and (('b2' = any(p_supported_input_schemes) and lower(j.blend_link) like 'b2://%')
      or ('google_drive' = any(p_supported_input_schemes)
        and lower(j.blend_link) ~ '^https://(drive\.google\.com|www\.googleapis\.com)/'))
    and (t.min_vram_mb is null or (p_worker_vram_mb is not null and t.min_vram_mb <= p_worker_vram_mb))
    and not (p_worker_id = any(coalesce(t.failed_by, '{}'::text[])))
  order by coalesce(j.priority, 999), t.retry_count, t.id limit 1 for update of t skip locked;
  if v_task_id is null then return; end if;
  update public.tasks set status = 'active', worker_id = p_worker_id,
    claimed_at = now(), last_heartbeat = now() where id = v_task_id and status = 'queued';
  insert into public.task_attempts(task_id, worker_id, lease_generation, assigned_at, status)
    values (v_task_id, p_worker_id, v_generation, now(), 'in_progress') returning id into v_attempt_id;
  update public.workers set status = 'busy', last_seen_at = now(),
    current_task_id = v_task_id, current_generation = v_generation where worker_id = p_worker_id;
  return query select v_task_id, v_job_id, v_frame_start, v_frame_end, v_generation, v_attempt_id;
end;
$function$;

revoke all on function public.report_worker_failure(bigint, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.report_worker_failure(bigint, integer, text, text, text)
  to service_role;
revoke all on function public.report_worker_probe(text, text, text)
  from public, anon, authenticated;
grant execute on function public.report_worker_probe(text, text, text)
  to service_role;
revoke all on function public.claim_next_resilient_task(text, integer, text[])
  from public, anon, authenticated;
grant execute on function public.claim_next_resilient_task(text, integer, text[])
  to service_role;

comment on function public.report_worker_failure(bigint, integer, text, text, text) is
  'Fenced taxonomy-aware Worker failure: bounded task failover and health scoring without poisoning transient/input failures.';
comment on function public.report_worker_probe(text, text, text) is
  'Authenticated lightweight Worker probe lifecycle: PROBING, OK or FAILED; security incidents remain blocked.';

-- Rollback: stop the new Node Agent/backend pair, restore the prior
-- 024_worker_input_capability_claim.sql definition of claim_next_resilient_task,
-- remove the two new RPC signatures, and retain incident/state history. Do not
-- drop workers.health_state or existing fencing columns automatically.
