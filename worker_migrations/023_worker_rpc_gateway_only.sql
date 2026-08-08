-- Canonical production Workers authenticate through the Backend HMAC gateway.
-- Direct publishable-key execution of Worker mutation/claim RPCs bypasses
-- that boundary and must be disabled. Keep service_role access for the
-- Backend gateway. Idempotent: missing historical signatures are skipped.

set lock_timeout = '5s';
set statement_timeout = '30s';

do $$
declare
  signature text;
  worker_signatures constant text[] := array[
    'register_worker(text,bigint,text,integer)',
    'worker_ping(text)',
    'claim_task(text,text)',
    'claim_task(text,text,integer)',
    'claim_next_task(text,integer)',
    'claim_next_generic_task(text,integer)',
    'claim_next_resilient_task(text,integer)',
    'get_claimed_task_spec(bigint,integer,text)',
    'report_heartbeat(bigint,integer,text)',
    'complete_task(bigint,integer,text)',
    'fail_task(bigint,integer,text,text)',
    'update_task_stage(bigint,integer,text,text,integer)',
    'report_worker_state_transition(text,text,bigint,text)',
    'report_render_speed(text,numeric)',
    'set_worker_version(text,text)',
    'requeue_stale_tasks()'
  ];
begin
  foreach signature in array worker_signatures loop
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

