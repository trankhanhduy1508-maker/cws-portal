-- CWS Worker Fleet — Phase 7 (CWS_WORKER_ROADMAP.md, "Mat dien va tu dieu
-- phoi"): mo rong 2 cron RPC DA CHAY THAT (requeue_stale_tasks(),
-- mark_stale_workers_offline()) de GHI LAI incident/state-transition moi
-- lan requeue/danh dau offline that su xay ra - hien tai 2 RPC nay chay
-- am tham, Admin Dashboard (Phase 6) khong thay duoc GI khi 1 task bi
-- requeue hay 1 worker bi rot mang.
--
-- KHONG DOI logic requeue/offline cu (van dung nguong 240s/180s, van
-- CHINH XAC cung dieu kien WHERE, cung UPDATE tasks/workers) - CHI THEM
-- 1 loi goi report_worker_incident()/report_worker_state_transition() (2
-- RPC da co tu Phase 3/6) cho MOI dong bi anh huong. Chuyen tu 1 cau
-- UPDATE hang loat sang vong lap FOR la thay doi CAU TRUC BAT BUOC de co
-- the biet CHINH XAC worker_id/task_id/generation nao vua bi anh huong
-- (UPDATE hang loat khong the goi 1 ham phu cho TUNG dong).
--
-- Nhat quan voi nguyen tac cua roadmap: "Khong ket luan chac chan cup
-- dien ngay khi mat heartbeat; co the la mat mang" - severity dung
-- 'warning' (KHONG phai 'critical'), event_type dung ten trung tinh
-- (STALE_HEARTBEAT_REQUEUE/WORKER_OFFLINE_UNRESPONSIVE), KHONG dung
-- 'POWER_LOSS_SUSPECTED' vi he thong hien tai KHONG co tin hieu nao de
-- phan biet mat dien voi mat mang (chi co 1 nguong thoi gian duy nhat).
--
-- 2 muc con lai cua Phase 7 KHONG can code moi vi DA duoc thoa man tu
-- truoc (xem docs/WORKER_FLEET_AUDIT.md Phase 7 de biet chi tiet):
--   - "Chong zombie/split-brain qua fencing token" - complete_task()/
--     fail_task()/report_heartbeat() DA kiem tra tasks.generation tu
--     truoc (xac nhan qua pg_get_functiondef khi audit Phase 1).
--   - "Chi dung checkpoint da xac minh tren storage" - Incremental
--     Recovery (get_existing_frames_on_b2()/validate_existing_frame_on_b2()
--     trong cws_worker_full.py, co tu truoc phien lam viec nay) DA lam
--     dung dieu nay: worker moi nhan lai task bi requeue se tu kiem tra
--     frame nao DA CO THAT tren B2 truoc khi render lai.
--   - "Thu tu uu tien may thay the" KHONG ap dung duoc cho kien truc
--     pull-based hien tai (worker tu claim_task() khi ranh, khong co bo
--     dieu phoi trung tam chon may) - xem ghi chu trong audit doc, KHONG
--     ep them 1 he thong cham diem/dieu phoi moi (vuot qua pham vi
--     "refactor nho", rui ro cao, chua co yeu cau ro rang).

create or replace function public.requeue_stale_tasks()
returns integer
language plpgsql
security definer
as $function$
declare
  v_requeued_count int := 0;
  v_row record;
begin
  for v_row in
    select id, worker_id, generation
    from tasks
    where status = 'active'
      and last_heartbeat < now() - interval '240 seconds'
  loop
    update tasks
    set status = 'queued',
        worker_id = null,
        claimed_at = null,
        last_heartbeat = null,
        generation = generation + 1   -- QUAN TRONG: tang generation moi lan requeue (khong doi)
    where id = v_row.id;

    v_requeued_count := v_requeued_count + 1;

    if v_row.worker_id is not null then
      perform public.report_worker_incident(
        p_worker_id => v_row.worker_id,
        p_task_id => v_row.id,
        p_event_type => 'STALE_HEARTBEAT_REQUEUE',
        p_severity => 'warning',
        p_error_code => null,
        p_summary => format(
          'Task %s bi requeue do mat heartbeat qua 240s (generation %s -> %s). Chua the ket luan mat dien hay mat mang.',
          v_row.id, v_row.generation, v_row.generation + 1
        ),
        p_details => jsonb_build_object('old_generation', v_row.generation, 'new_generation', v_row.generation + 1)
      );

      perform public.report_worker_state_transition(
        p_worker_id => v_row.worker_id,
        p_to_state => 'SUSPECTED_OFFLINE',
        p_task_id => null,
        p_reason => format('requeue_stale_tasks(): mat heartbeat qua 240s, task %s da bi requeue', v_row.id)
      );
    end if;
  end loop;

  return v_requeued_count;
end;
$function$;

create or replace function public.mark_stale_workers_offline()
returns integer
language plpgsql
security definer
as $function$
declare
  v_count int := 0;
  v_row record;
begin
  for v_row in
    select worker_id
    from workers
    where status != 'offline'
      and last_seen_at < now() - interval '180 seconds'
  loop
    update workers
    set status = 'offline'
    where worker_id = v_row.worker_id;

    v_count := v_count + 1;

    perform public.report_worker_incident(
      p_worker_id => v_row.worker_id,
      p_task_id => null,
      p_event_type => 'WORKER_OFFLINE_UNRESPONSIVE',
      p_severity => 'warning',
      p_error_code => null,
      p_summary => format(
        'Worker %s khong con heartbeat qua 180s, danh dau offline. Chua the ket luan mat dien hay mat mang.',
        v_row.worker_id
      ),
      p_details => null
    );

    perform public.report_worker_state_transition(
      p_worker_id => v_row.worker_id,
      p_to_state => 'OFFLINE_UNRESPONSIVE',
      p_task_id => null,
      p_reason => 'mark_stale_workers_offline(): mat heartbeat qua 180s'
    );
  end loop;

  return v_count;
end;
$function$;

-- ===== ROLLBACK (chay tay neu can, ve dung ban goc truoc Phase 7) =====
-- create or replace function public.requeue_stale_tasks()
-- returns integer language plpgsql security definer as $function$
-- declare v_requeued_count int;
-- begin
--   update tasks set status = 'queued', worker_id = null, claimed_at = null,
--     last_heartbeat = null, generation = generation + 1
--   where status = 'active' and last_heartbeat < now() - interval '240 seconds';
--   get diagnostics v_requeued_count = row_count;
--   return v_requeued_count;
-- end; $function$;
--
-- create or replace function public.mark_stale_workers_offline()
-- returns integer language plpgsql security definer as $function$
-- declare v_count int;
-- begin
--   update workers set status = 'offline'
--   where status != 'offline' and last_seen_at < now() - interval '180 seconds';
--   get diagnostics v_count = row_count;
--   return v_count;
-- end; $function$;
