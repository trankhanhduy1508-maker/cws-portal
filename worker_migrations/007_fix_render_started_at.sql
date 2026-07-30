-- CWS Worker Fleet — Phase 8 (sua loi do CHINH migration 006 gay ra, phat
-- hien TRUOC KHI wiring Python, chua co du lieu that nao bi anh huong):
-- report_worker_ready() ghi worker_ready_at/billable_started_at nhung
-- QUEN ghi render_started_at - trong khi compute_host_usage_sessions()
-- (006) DUNG task_attempts.render_started_at de tinh waiting_seconds/
-- render_seconds. Khong RPC nao khac ghi cot nay, nen no se LUON null,
-- lam waiting_seconds/render_seconds LUON tinh ra 0 sai.
--
-- Trong kien truc hien tai cua cws_worker_full.py, "san sang render" va
-- "bat dau render frame dau tien" la CUNG 1 thoi diem (report_worker_ready()
-- va vong lap render frame dau tien duoc goi sat nhau, khong co pha cho
-- doi rieng o giua) - nen render_started_at = worker_ready_at la dung
-- ban chat, KHONG can them 1 RPC/diem wiring Python moi rieng cho
-- "render_started".

create or replace function public.report_worker_ready(
  p_task_id bigint, p_worker_id text, p_generation integer
) returns boolean
language plpgsql
security definer
as $function$
declare v_id bigint;
begin
  update task_attempts
  set worker_ready_at = coalesce(worker_ready_at, now()),
      billable_started_at = coalesce(billable_started_at, now()),
      render_started_at = coalesce(render_started_at, now())
  where task_id = p_task_id and worker_id = p_worker_id and lease_generation = p_generation
    and status = 'in_progress'
  returning id into v_id;
  return v_id is not null;
end;
$function$;

comment on function public.report_worker_ready is
  'Phase 8 - goi khi Worker THAT SU san sang render (ngay truoc frame dau tien). Ghi worker_ready_at/billable_started_at/render_started_at CUNG luc (kien truc hien tai khong co pha cho doi rieng giua "san sang" va "bat dau render"). coalesce() giu nguyen gia tri cu neu start_task_attempt() da dat truoc.';

-- ===== ROLLBACK =====
-- create or replace function public.report_worker_ready(
--   p_task_id bigint, p_worker_id text, p_generation integer
-- ) returns boolean language plpgsql security definer as $function$
-- declare v_id bigint;
-- begin
--   update task_attempts set worker_ready_at = coalesce(worker_ready_at, now()),
--       billable_started_at = coalesce(billable_started_at, now())
--   where task_id = p_task_id and worker_id = p_worker_id and lease_generation = p_generation
--     and status = 'in_progress'
--   returning id into v_id;
--   return v_id is not null;
-- end; $function$;
