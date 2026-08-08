-- Remove direct Data API execution from every internal Worker/fleet RPC still
-- exposed in production. Canonical Workers use the authenticated Backend
-- gateway; backend/cron/trigger execution continues through service_role or
-- the database owner.
set lock_timeout = '5s';
set statement_timeout = '30s';

do $$
declare
  signature text;
  internal_signatures constant text[] := array[
    'claim_shutdown_slot(text,bigint)',
    'compute_host_usage_sessions()',
    'count_active_workers(integer)',
    'create_job(text,text,text)',
    'create_job_with_chunks(text,text,text,integer)',
    'create_job_with_chunks(text,text,text,integer,integer)',
    'create_task(text,integer,integer,integer)',
    'estimate_job_eta(text)',
    'finalize_task_attempt(bigint,text,integer,text)',
    'get_fleet_capacity()',
    'get_total_capacity()',
    'handle_new_auth_user()',
    'log_task_event(bigint,text,text)',
    'mark_stale_workers_offline()',
    'release_merge_lock(text)',
    'report_task_attempt_stage(bigint,text,integer,text)',
    'report_worker_crash(text,text)',
    'report_worker_incident(text,bigint,text,text,text,text,jsonb)',
    'report_worker_ready(bigint,text,integer)',
    'set_job_total_frames(text,text,integer,numeric)',
    'start_task_attempt(bigint,text,integer,double precision)',
    'try_acquire_merge_lock(text)'
  ];
begin
  foreach signature in array internal_signatures loop
    if to_regprocedure('public.' || signature) is not null then
      execute format(
        'revoke execute on function public.%s from public, anon, authenticated',
        signature
      );
      execute format(
        'grant execute on function public.%s to service_role',
        signature
      );
      execute format(
        'alter function public.%s set search_path = public, pg_temp',
        signature
      );
    end if;
  end loop;
end $$;

-- Rollback is intentionally not automatic. Re-exposing any internal
-- SECURITY DEFINER RPC requires a new authenticated authorization design.
