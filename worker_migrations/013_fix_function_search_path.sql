-- Pin SECURITY DEFINER search_path for every Worker/Fleet RPC present.
-- The staging base is intentionally minimal; functions outside the P0 Worker
-- contract are skipped when absent. Production behavior is unchanged because
-- every listed production function exists there.
do $$
declare
  sig text;
  signatures constant text[] := array[
    'admin_confirm_host_usage_final_amount(bigint,numeric)',
    'admin_requeue_task(bigint)',
    'admin_retry_task(bigint)',
    'admin_set_worker_drain(text,boolean,text)',
    'admin_set_worker_quarantine(text,boolean,text)',
    'claim_next_task(text,integer)',
    'claim_shutdown_slot(text,bigint)',
    'claim_task(text,text)',
    'claim_task(text,text,integer)',
    'complete_task(bigint,integer,text)',
    'compute_host_usage_sessions()',
    'count_active_workers(integer)',
    'create_job(text,text,text)',
    'create_job_with_chunks(text,text,text,integer)',
    'create_job_with_chunks(text,text,text,integer,integer)',
    'create_task(text,integer,integer,integer)',
    'estimate_job_eta(text)',
    'fail_task(bigint,integer,text,text)',
    'finalize_task_attempt(bigint,text,integer,text)',
    'find_wake_candidates()',
    'get_fleet_capacity()',
    'get_job_render_summary(text)',
    'get_total_capacity()',
    'log_task_event(bigint,text,text)',
    'mark_stale_workers_offline()',
    'register_worker(text,bigint,text,integer)',
    'release_merge_lock(text)',
    'report_heartbeat(bigint,integer,text)',
    'report_render_speed(text,numeric)',
    'report_task_attempt_stage(bigint,text,integer,text)',
    'report_worker_crash(text,text)',
    'report_worker_incident(text,bigint,text,text,text,text,jsonb)',
    'report_worker_ready(bigint,text,integer)',
    'report_worker_state_transition(text,text,bigint,text)',
    'requeue_stale_tasks()',
    'set_job_total_frames(text,text,integer,numeric)',
    'set_worker_version(text,text)',
    'start_task_attempt(bigint,text,integer,double precision)',
    'try_acquire_merge_lock(text)',
    'update_task_stage(bigint,integer,text,text,integer)',
    'worker_ping(text)',
    'set_optimization_plan_if_missing(text,jsonb)'
  ];
begin
  foreach sig in array signatures loop
    if to_regprocedure('public.' || sig) is not null then
      execute format('alter function public.%s set search_path = public, pg_temp', sig);
    end if;
  end loop;
end $$;
