-- CWS Worker Fleet — Ngoai pham vi CWS_WORKER_ROADMAP.md (roadmap da het
-- o Phase 8) - dong lo hong con lai cua Phase 8 ("Backend tinh thoi gian
-- va so tien; Worker khong duoc tu quyet dinh billing" - final_amount
-- LUON null cho toi khi co hanh dong Admin rieng, chua lam luc dau).
--
-- CHI Postgres + Backend/Frontend, KHONG dong Python - day la hanh dong
-- CUOI CUNG cua quy trinh billing (Admin XAC NHAN so tien that su tinh
-- tien khach/doi tac, sau khi da xem estimated_amount THAM KHAO) - dung
-- nguyen tac "he thong tu dong khong tu quyet dinh cuoi cung, chi uoc tinh".

create or replace function public.admin_confirm_host_usage_final_amount(
  p_session_id bigint, p_final_amount numeric
) returns boolean
language plpgsql
security definer
as $function$
declare
  v_count int;
  v_worker_id text;
  v_task_id bigint;
begin
  if p_final_amount is null or p_final_amount < 0 then
    return false;
  end if;

  update host_usage_sessions
  set final_amount = p_final_amount, status = 'finalized'
  where id = p_session_id
  returning worker_id, task_id into v_worker_id, v_task_id;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform public.report_worker_incident(
      p_worker_id => v_worker_id,
      p_task_id => v_task_id,
      p_event_type => 'ADMIN_CONFIRM_FINAL_AMOUNT',
      p_severity => 'warning',
      p_error_code => null,
      p_summary => format('Admin xac nhan final_amount=%s cho host_usage_sessions id=%s', p_final_amount, p_session_id),
      p_details => jsonb_build_object('session_id', p_session_id, 'final_amount', p_final_amount)
    );
  end if;

  return v_count > 0;
end;
$function$;

comment on function public.admin_confirm_host_usage_final_amount is
  'Ngoai roadmap (dong lo hong Phase 8) - hanh dong DUY NHAT ghi host_usage_sessions.final_amount, CHI Admin goi qua Backend (khong Worker/khong he thong tu dong nao khac). Ghi audit qua worker_incidents (event_type ADMIN_CONFIRM_FINAL_AMOUNT), dung quy uoc da co tu cac admin_* RPC khac.';

-- ===== ROLLBACK =====
-- drop function if exists public.admin_confirm_host_usage_final_amount(bigint, numeric);
