-- Production-ready, idempotent RPC hardening proposal.
-- Apply through the production change process only after reviewing the
-- Worker authentication contract. This migration deliberately keeps the
-- publishable-key Worker RPCs required by the current runtime contract.

do $$
declare
  sig text;
  internal_signatures constant text[] := array[
    'admin_confirm_host_usage_final_amount(bigint,numeric)',
    'admin_requeue_task(bigint)',
    'admin_retry_task(bigint)',
    'admin_set_worker_drain(text,boolean,text)',
    'admin_set_worker_quarantine(text,boolean,text)',
    'admin_cancel_job(text)',
    'claim_next_task(text,integer)',
    'claim_shutdown_slot(text,bigint)',
    'claim_task(text,text)',
    'claim_task(text,text,integer)',
    'compute_host_usage_sessions()',
    'count_active_workers(integer)',
    'create_job(text,text,text)',
    'create_job_with_chunks(text,text,text,integer)',
    'create_job_with_chunks(text,text,text,integer,integer)',
    'create_task(text,integer,integer,integer)',
    'estimate_job_eta(text)',
    'find_wake_candidates()',
    'get_fleet_capacity()',
    'get_total_capacity()',
    'log_task_event(bigint,text,text)',
    'mark_stale_workers_offline()',
    'release_merge_lock(text)',
    'requeue_stale_tasks()',
    'report_render_speed(text,numeric)',
    'report_task_attempt_stage(bigint,text,integer,text)',
    'set_job_total_frames(text,text,integer,numeric)',
    'set_worker_version(text,text)',
    'start_task_attempt(bigint,text,integer,double precision)',
    'try_acquire_merge_lock(text)',
    'update_task_stage(bigint,integer,text,text,integer)'
  ];
begin
  foreach sig in array internal_signatures loop
    if to_regprocedure('public.' || sig) is not null then
      execute format('revoke execute on function public.%s from public, anon, authenticated', sig);
      execute format('alter function public.%s set search_path = public, pg_temp', sig);
    end if;
  end loop;
end $$;

