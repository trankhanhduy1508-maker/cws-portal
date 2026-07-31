-- CWS Worker Fleet — admin_cancel_job(): dong lo hong "khach bam Huy
-- Render nhung Worker khong biet, van tiep tuc render" (jobs.service.ts
-- cancel() truoc gio CHI update render_orders.status=CANCELLED o schema
-- Backend, KHONG cham gi den bang `jobs`/`tasks` cua Worker Fleet).
--
-- Theo dung nguyen tac da dat ra o worker-fleet.gateway.ts ("TUYET DOI
-- khong sua schema jobs/tasks, khong doi logic Worker") - ham nay CHI
-- UPDATE cot `tasks.status` (cot da co san, cung cach admin_retry_task/
-- admin_requeue_task o migration 008 dang dung) sang 1 gia tri moi
-- 'cancelled' - KHONG ALTER TABLE, KHONG sua claim_task(). claim_task()
-- hien tai CHI claim task co status='queued', nen task bi doi sang
-- 'cancelled' se TU DONG khong bao gio duoc claim nua - khong can sua
-- claim_task().
--
-- GIOI HAN DA BIET (khong tu y sua Python de xu ly): task dang
-- status='active' (Worker DANG render dot do) se KHONG bi ngat giua
-- chung ngay lap tuc, vi cws_worker_full.py hien khong poll trang thai
-- task/job trong luc render (chi goi claim_task() luc BAT DAU). Worker
-- se tu dung sau khi hoan tat task dang lam va khong con task 'queued'
-- nao khac cua job do de claim tiep. Neu can ngat render giua chung,
-- phai sua them cws_worker_full.py (ngoai pham vi task hien tai).

create or replace function public.admin_cancel_job(p_job_id text)
returns integer
language plpgsql
security definer
as $function$
declare
  v_count int := 0;
  v_task record;
begin
  for v_task in
    select id, worker_id from tasks
    where job_id = p_job_id and status in ('queued', 'active')
  loop
    update tasks
    set status = 'cancelled', worker_id = null, claimed_at = null,
        last_heartbeat = null, generation = generation + 1
    where id = v_task.id;

    v_count := v_count + 1;

    perform public.report_worker_incident(
      p_worker_id => v_task.worker_id,
      p_task_id => v_task.id,
      p_event_type => 'ADMIN_CANCEL_JOB',
      p_severity => 'warning',
      p_error_code => null,
      p_summary => format('Admin huy job %s (task %s)', p_job_id, v_task.id),
      p_details => jsonb_build_object('job_id', p_job_id)
    );
  end loop;

  return v_count;
end;
$function$;

comment on function public.admin_cancel_job is
  'Admin/khach huy job (dong lo hong: jobs.service.ts cancel() truoc gio khong bao Worker) - doi tat ca task queued/active cua 1 job sang status=cancelled (cot co san, khong ALTER TABLE). claim_task() tu dong bo qua vi chi claim status=queued. Task dang active se hoan tat lan render hien tai roi moi dung han (worker khong poll trang thai giua chung), xem ghi chu tren dau file.';

-- ===== ROLLBACK (chay tay neu can) =====
-- drop function if exists public.admin_cancel_job(text);
