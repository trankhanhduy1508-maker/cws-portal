-- CWS Worker Fleet — Ngoai pham vi CWS_WORKER_ROADMAP.md (roadmap da het
-- o Phase 8) - dong lo hong con lai ro rang nhat cua Phase 6 ("Admin
-- dashboard can: hanh dong retry/requeue/quarantine/drain, audit log
-- hanh dong admin"), theo lua chon cua Dy 31/07/2026.
--
-- CHI Postgres, KHONG dong Python - cws_worker_full.py KHONG can biet
-- gi ve cac RPC/hanh dong Admin nay. "Quarantine"/"drain" duoc THUC THI
-- (khong chi la nhan hien thi) bang cach mo rong claim_task() (RPC DUY
-- NHAT moi Worker goi de xin viec) tu choi claim NGAY TU DAU neu CHINH
-- worker dang goi dang bi quarantine/drain - worker se nhan ket qua
-- giong HET luc "khong co task nao de claim" (mang rong), hanh vi von
-- da duoc code Python xu ly dung tu truoc, KHONG can sua Python.
--
-- Audit log hanh dong Admin: TAI SU DUNG worker_incidents (Phase 6) thay
-- vi tao bang moi rieng - moi hanh dong Admin ghi 1 dong voi event_type
-- tien to ADMIN_*, hien ngay trong bang "Su co Worker Fleet" Admin da co
-- san (Phase 6/7), KHONG can bang/UI audit log rieng.

-- ===== 1. Mo rong claim_task() (ban SECURITY DEFINER, 3 tham so - ban
-- Worker THAT SU dang goi, xac nhan qua pg_get_functiondef) - THEM 1
-- kiem tra o dau ham, GIU NGUYEN 100% logic con lai =====
create or replace function public.claim_task(p_job_id text, p_worker_id text, p_worker_vram_mb integer DEFAULT NULL::integer)
returns table(task_id bigint, out_frame_start integer, out_frame_end integer, out_generation integer)
language plpgsql
security definer
as $function$
declare
    v_task_id bigint;
    v_frame_start int;
    v_frame_end int;
    v_generation int;
    v_health_state text;
    v_desired_state text;
begin
    -- Admin action (migration 008): worker dang bi quarantine/drain
    -- KHONG duoc claim task moi - tra ve mang rong (KHAC voi loi/exception),
    -- worker se tu hieu la "khong co task", y het hanh vi da co san khi
    -- Fleet het viec - khong can sua code Python.
    select health_state, desired_state into v_health_state, v_desired_state
    from workers where worker_id = p_worker_id;

    if v_health_state = 'QUARANTINED' or v_desired_state = 'DRAINING' then
        return;
    end if;

    -- Uu tien 1: task chua bi CHINH worker nay fail lan cuoi (tranh lap lai ngay)
    update tasks
    set status = 'active', worker_id = p_worker_id,
        claimed_at = now(), last_heartbeat = now()
    where id = (
        select t.id from tasks t
        where t.job_id = p_job_id
          and t.status = 'queued'
          and (t.min_vram_mb is null or (p_worker_vram_mb is not null and t.min_vram_mb <= p_worker_vram_mb))
          and (t.failed_by is null or not (p_worker_id = t.failed_by[array_upper(t.failed_by,1)]))
        order by t.frame_start
        limit 1
        for update skip locked
    )
    returning tasks.id, tasks.frame_start, tasks.frame_end, tasks.generation
    into v_task_id, v_frame_start, v_frame_end, v_generation;

    -- Fallback: khong con task nao khac (worker nay la ung vien DUY NHAT con
    -- lai) - van cho claim, tot hon la de Fleet dung yen khong render gi
    if v_task_id is null then
        update tasks
        set status = 'active', worker_id = p_worker_id,
            claimed_at = now(), last_heartbeat = now()
        where id = (
            select t.id from tasks t
            where t.job_id = p_job_id
              and t.status = 'queued'
              and (t.min_vram_mb is null or (p_worker_vram_mb is not null and t.min_vram_mb <= p_worker_vram_mb))
            order by t.frame_start
            limit 1
            for update skip locked
        )
        returning tasks.id, tasks.frame_start, tasks.frame_end, tasks.generation
        into v_task_id, v_frame_start, v_frame_end, v_generation;
    end if;

    if v_task_id is not null then
        update workers set status = 'busy', last_seen_at = now()
        where worker_id = p_worker_id;
    end if;

    return query select v_task_id, v_frame_start, v_frame_end, v_generation;
end;
$function$;

-- ===== 2. admin_retry_task() - dua 1 task DA 'failed' (permanent) ve
-- 'queued' de thu lai =====
create or replace function public.admin_retry_task(p_task_id bigint)
returns boolean
language plpgsql
security definer
as $function$
declare
  v_count int;
  v_last_worker_id text;
begin
  select failed_by[array_upper(failed_by, 1)] into v_last_worker_id
  from tasks where id = p_task_id and status = 'failed';

  update tasks
  set status = 'queued', worker_id = null, claimed_at = null, last_heartbeat = null,
      generation = generation + 1, failed_by = null, error_category = null
  where id = p_task_id and status = 'failed';
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform public.report_worker_incident(
      p_worker_id => v_last_worker_id,
      p_task_id => p_task_id,
      p_event_type => 'ADMIN_RETRY_TASK',
      p_severity => 'warning',
      p_error_code => null,
      p_summary => format('Admin retry thu cong task %s (tu status failed ve queued)', p_task_id),
      p_details => null
    );
  end if;

  return v_count > 0;
end;
$function$;

comment on function public.admin_retry_task is
  'Admin action (ngoai roadmap, dong lo hong Phase 6) - CHI ap dung cho task dang status=failed (permanent). Tang generation de an toan (fencing token), xoa failed_by/error_category de worker khac co the claim lai binh thuong.';

-- ===== 3. admin_requeue_task() - ep 1 task dang 'active' ve 'queued'
-- NGAY (khong doi requeue_stale_tasks() tu dong sau 240s) =====
create or replace function public.admin_requeue_task(p_task_id bigint)
returns boolean
language plpgsql
security definer
as $function$
declare
  v_worker_id text;
  v_generation int;
  v_count int;
begin
  select worker_id, generation into v_worker_id, v_generation
  from tasks where id = p_task_id and status = 'active';

  if v_worker_id is null then
    return false;
  end if;

  update tasks
  set status = 'queued', worker_id = null, claimed_at = null, last_heartbeat = null,
      generation = generation + 1
  where id = p_task_id;
  get diagnostics v_count = row_count;

  perform public.report_worker_incident(
    p_worker_id => v_worker_id,
    p_task_id => p_task_id,
    p_event_type => 'ADMIN_MANUAL_REQUEUE',
    p_severity => 'warning',
    p_error_code => null,
    p_summary => format('Admin requeue thu cong task %s (worker %s, generation %s -> %s)', p_task_id, v_worker_id, v_generation, v_generation + 1),
    p_details => jsonb_build_object('old_generation', v_generation, 'new_generation', v_generation + 1)
  );

  update task_attempts
  set status = 'superseded'
  where task_id = p_task_id and worker_id = v_worker_id
    and lease_generation = v_generation and status = 'in_progress';

  return v_count > 0;
end;
$function$;

comment on function public.admin_requeue_task is
  'Admin action (ngoai roadmap, dong lo hong Phase 6) - ban thu cong cua requeue_stale_tasks() (Phase 7) cho DUNG 1 task, dung khi Admin biet chac worker dang giu task da chet/treo, khong muon doi 240s. Tang generation (fencing), dong task_attempts cu la superseded.';

-- ===== 4. admin_set_worker_quarantine() - THUC THI qua claim_task() o
-- tren, khong chi la nhan hien thi =====
create or replace function public.admin_set_worker_quarantine(
  p_worker_id text, p_quarantined boolean, p_reason text default null
) returns boolean
language plpgsql
security definer
as $function$
declare v_count int;
begin
  update workers
  set health_state = case when p_quarantined then 'QUARANTINED' else null end
  where worker_id = p_worker_id;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform public.report_worker_incident(
      p_worker_id => p_worker_id,
      p_task_id => null,
      p_event_type => case when p_quarantined then 'ADMIN_QUARANTINE' else 'ADMIN_UNQUARANTINE' end,
      p_severity => 'warning',
      p_error_code => null,
      p_summary => coalesce(p_reason, format('Admin %s worker %s', case when p_quarantined then 'quarantine' else 'un-quarantine' end, p_worker_id)),
      p_details => null
    );
  end if;

  return v_count > 0;
end;
$function$;

comment on function public.admin_set_worker_quarantine is
  'Admin action (ngoai roadmap, dong lo hong Phase 6) - ghi workers.health_state (Phase 3, doc lap voi observed_state). THUC THI qua claim_task() (migration 008) - worker quarantine se khong claim duoc task moi nua, KHONG can sua Python.';

-- ===== 5. admin_set_worker_drain() - THUC THI qua claim_task() o tren =====
create or replace function public.admin_set_worker_drain(
  p_worker_id text, p_draining boolean, p_reason text default null
) returns boolean
language plpgsql
security definer
as $function$
declare v_count int;
begin
  update workers
  set desired_state = case when p_draining then 'DRAINING' else null end
  where worker_id = p_worker_id;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform public.report_worker_incident(
      p_worker_id => p_worker_id,
      p_task_id => null,
      p_event_type => case when p_draining then 'ADMIN_DRAIN' else 'ADMIN_UNDRAIN' end,
      p_severity => 'warning',
      p_error_code => null,
      p_summary => coalesce(p_reason, format('Admin %s worker %s', case when p_draining then 'drain' else 'un-drain' end, p_worker_id)),
      p_details => null
    );
  end if;

  return v_count > 0;
end;
$function$;

comment on function public.admin_set_worker_drain is
  'Admin action (ngoai roadmap, dong lo hong Phase 6) - ghi workers.desired_state=DRAINING (Phase 3). THUC THI qua claim_task() (migration 008) - worker dang drain se khong claim task moi (van hoan tat task dang lam do, vi claim_task() chi chan LAN CLAIM TIEP THEO), KHONG can sua Python.';

-- ===== ROLLBACK (chay tay neu can, ve dung ban claim_task() truoc migration 008) =====
-- create or replace function public.claim_task(p_job_id text, p_worker_id text, p_worker_vram_mb integer DEFAULT NULL::integer)
-- returns table(task_id bigint, out_frame_start integer, out_frame_end integer, out_generation integer)
-- language plpgsql security definer as $function$
-- declare v_task_id bigint; v_frame_start int; v_frame_end int; v_generation int;
-- begin
--   update tasks set status = 'active', worker_id = p_worker_id, claimed_at = now(), last_heartbeat = now()
--   where id = (select t.id from tasks t where t.job_id = p_job_id and t.status = 'queued'
--     and (t.min_vram_mb is null or (p_worker_vram_mb is not null and t.min_vram_mb <= p_worker_vram_mb))
--     and (t.failed_by is null or not (p_worker_id = t.failed_by[array_upper(t.failed_by,1)]))
--     order by t.frame_start limit 1 for update skip locked)
--   returning tasks.id, tasks.frame_start, tasks.frame_end, tasks.generation
--   into v_task_id, v_frame_start, v_frame_end, v_generation;
--   if v_task_id is null then
--     update tasks set status = 'active', worker_id = p_worker_id, claimed_at = now(), last_heartbeat = now()
--     where id = (select t.id from tasks t where t.job_id = p_job_id and t.status = 'queued'
--       and (t.min_vram_mb is null or (p_worker_vram_mb is not null and t.min_vram_mb <= p_worker_vram_mb))
--       order by t.frame_start limit 1 for update skip locked)
--     returning tasks.id, tasks.frame_start, tasks.frame_end, tasks.generation
--     into v_task_id, v_frame_start, v_frame_end, v_generation;
--   end if;
--   if v_task_id is not null then
--     update workers set status = 'busy', last_seen_at = now() where worker_id = p_worker_id;
--   end if;
--   return query select v_task_id, v_frame_start, v_frame_end, v_generation;
-- end; $function$;
-- drop function if exists public.admin_set_worker_drain(text, boolean, text);
-- drop function if exists public.admin_set_worker_quarantine(text, boolean, text);
-- drop function if exists public.admin_requeue_task(bigint);
-- drop function if exists public.admin_retry_task(bigint);
