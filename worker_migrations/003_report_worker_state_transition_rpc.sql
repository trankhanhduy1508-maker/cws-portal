-- CWS Worker Fleet - Phase 3 (CWS_WORKER_ROADMAP.md): RPC de Worker tu
-- bao cao chuyen trang thai (observed_state) vao schema da tao o migration
-- 001 (workers.observed_state/last_transition_at/state_reason,
-- worker_state_events). KHONG dong vao workers.status (idle/busy/offline)
-- hien co - do van la nguon su that cho cac co che dang chay that
-- (mark_stale_workers_offline/requeue_stale_tasks/claim_task/complete_task/
-- fail_task), theo dung quyet dinh "mo rong tren nen co" cua nguoi dung.
--
-- Chi ghi 1 dong vao worker_state_events KHI THAT SU doi trang thai (so
-- sanh voi observed_state hien tai) - dung nguyen tac Phase 5 roadmap
-- "khong tao log DB cho tung heartbeat", tranh lam phinh bang neu goi lap
-- lai cung 1 trang thai nhieu lan (vd moi vong lap ranh).
create or replace function public.report_worker_state_transition(
  p_worker_id text,
  p_to_state text,
  p_task_id bigint default null,
  p_reason text default null
) returns boolean
language plpgsql
security definer
as $function$
declare
  v_from_state text;
begin
  select observed_state into v_from_state from workers where worker_id = p_worker_id;

  update workers
  set observed_state = p_to_state,
      current_task_id = p_task_id,
      last_transition_at = now(),
      state_reason = p_reason
  where worker_id = p_worker_id;

  if not found then
    return false;
  end if;

  if v_from_state is distinct from p_to_state then
    insert into worker_state_events (worker_id, task_id, from_state, to_state, reason)
    values (p_worker_id, p_task_id, v_from_state, p_to_state, p_reason);
  end if;

  return true;
end;
$function$;

comment on function public.report_worker_state_transition is
  'Phase 3 CWS_WORKER_ROADMAP.md - Worker tu bao cao observed_state (KHONG dong vao workers.status hien co, van la nguon su that cho cron/RPC dang chay that). Chi ghi worker_state_events khi THAT SU doi trang thai, tranh phinh bang vi heartbeat.';

-- ===== ROLLBACK (chay tay neu can) =====
-- drop function if exists public.report_worker_state_transition(text, text, bigint, text);
