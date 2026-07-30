-- CWS Worker Fleet — Phase 8 (CWS_WORKER_ROADMAP.md, "Thong ke thoi gian
-- thue host"): task_attempts (schema co san tu Phase 3, CHUA co code nao
-- ghi) duoc Worker ghi timestamp THAT qua 4 RPC moi + 1 ham tinh billing
-- CHAY RIENG qua cron (Worker KHONG BAO GIO goi ham tinh tien - dung
-- nguyen tac roadmap "Backend tinh thoi gian va so tien; Worker khong
-- duoc tu quyet dinh billing").
--
-- QUYET DINH THIET KE quan trong (ghi ro vi khong the doan tu roadmap):
--
-- 1. "Khoi dong 7 phut" trong HE THONG NAY khac vi du roadmap hinh dung
--    (Wake-on-LAN/cold-boot) - Phase 4 da xac dinh may KHONG sleep/
--    hibernate/wake, chi tat man hinh luc ranh, nen may hau nhu LUON
--    dang chay. "Khoi dong" thuc te trong he thong nay la: process
--    Python VUA duoc (tu dong) khoi dong lai (crash/update/khoi dong tay)
--    va claim task DAU TIEN. Dung 1 hang so process_started_at (thoi
--    diem process Python bat dau chay, khong doi trong suot vong doi
--    process) gui kem RPC dau tien - RPC tu suy ra day co phai lan claim
--    DAU TIEN cua process nay khong (khong co task_attempts nao voi
--    assigned_at >= process_started_at) - NEU la lan dau, tinh khoang
--    [process_started_at, worker_ready_at] la "khoi dong". Cac task SAU
--    do trong CUNG process KHONG con "khoi dong" nua (dung yeu cau roadmap
--    "may da IDLE_WAITING_JOB thi khong tao them 7 phut startup").
--
-- 2. Kien truc CHECKPOINT-PER-FRAME (render+upload TUNG frame, khong co
--    "pha upload" rieng sau khi render xong CA task) khien
--    upload_completed_at KHONG the tach biet ro voi render_completed_at -
--    ca 2 duoc ghi CUNG 1 thoi diem (ngay sau vong lap frame ket thuc
--    thanh cong). verification_completed_at dung dung diem "kiem tra du
--    so frame da upload = frame yeu cau" (expected_count) da co san trong
--    code, KHONG phai buoc kiem tra moi.
--
-- 3. merge_completed_at CHUA duoc wiring o vong nay - attempt_job_video_merge()
--    hien khong tra ve gia tri de biet no THAT SU chay merge hay chi no-op
--    (vd job chua du dieu kien ghep, hoac flag CWS_ENABLE_INTEGRATED_VIDEO_MERGE
--    dang tat theo mac dinh cws_worker.bat) - can sua doi contract ham do
--    de biet chinh xac, de lai vong sau tranh doan sai. merge_seconds se
--    la 0 cho toi luc do (khong sai, chi thieu chi tiet).
--
-- 4. KHONG co "host_id" tach biet worker_id (kien truc hien tai 1 worker
--    = 1 may vat ly, dung nhu da ghi chu o worker_state_events) - de
--    null, dung quy uoc da co.
--
-- 5. hourly_rate: KHONG co cau hinh gia nao ton tai san (kiem tra
--    fleets/partners/workers - khong cot nao ten hourly_rate/gia). THEM
--    cot fleets.hourly_rate (nullable, KHONG dat gia tri mac dinh - de
--    Dy tu cau hinh qua SQL Editor khi co gia that, KHONG bia so). Neu
--    chua co gia, status='awaiting_rate', estimated_amount/final_amount
--    = null (KHONG hien 0 gay hieu lam la "mien phi").
--
-- 6. final_amount LUON de null trong ham tinh tu dong nay - chi
--    estimated_amount duoc tinh. Xac nhan "final" la hanh dong cua Admin
--    (chua lam UI cho viec nay vong nay, ngoai pham vi) - dung dung
--    nguyen tac "Worker khong duoc tu quyet dinh billing", mo rong them:
--    he thong tu dong cung KHONG tu quyet dinh "cuoi cung", chi uoc tinh.

-- ===== 1. fleets.hourly_rate (moi, nullable) =====
alter table public.fleets add column if not exists hourly_rate numeric;
comment on column public.fleets.hourly_rate is
  'Phase 8 CWS_WORKER_ROADMAP.md - gia thue host theo gio (VND/gio hoac don vi Dy quy dinh), Dy tu cau hinh qua SQL Editor. NULL = chua co gia, host_usage_sessions.status se la awaiting_rate.';

-- ===== 2. host_usage_sessions (moi, dung dung cot roadmap section 11) =====
create table if not exists public.host_usage_sessions (
  id bigint generated always as identity primary key,
  host_id text,
  worker_id text references public.workers(worker_id),
  task_id bigint references public.tasks(id),
  attempt_id bigint not null references public.task_attempts(id),
  startup_seconds numeric not null default 0,
  startup_grace_seconds integer not null default 420,
  waiting_seconds numeric not null default 0,
  render_seconds numeric not null default 0,
  merge_seconds numeric not null default 0,
  upload_seconds numeric not null default 0,
  verification_seconds numeric not null default 0,
  billable_seconds numeric not null default 0,
  non_billable_seconds numeric not null default 0,
  hourly_rate numeric,
  estimated_amount numeric,
  final_amount numeric,
  status text not null default 'computed',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_host_usage_sessions_attempt_id on public.host_usage_sessions (attempt_id);
create index if not exists idx_host_usage_sessions_worker_id on public.host_usage_sessions (worker_id);
create index if not exists idx_host_usage_sessions_task_id on public.host_usage_sessions (task_id);
create index if not exists idx_host_usage_sessions_status on public.host_usage_sessions (status);
create index if not exists idx_host_usage_sessions_created_at on public.host_usage_sessions (created_at desc);

comment on table public.host_usage_sessions is
  'Phase 8 CWS_WORKER_ROADMAP.md - thong ke thoi gian/tien cho 1 task_attempts hoan thanh, tinh boi compute_host_usage_sessions() (cron, KHONG phai Worker goi). status: computed (co hourly_rate) / awaiting_rate (chua cau hinh gia) / decision_required (khoi dong vuot 7 phut, can Admin xem xet).';

alter table public.host_usage_sessions enable row level security;

-- ===== 3. RPC moi cho Worker - CHI ghi timestamp THAT, KHONG tinh tien =====

create or replace function public.start_task_attempt(
  p_task_id bigint,
  p_worker_id text,
  p_generation integer,
  p_process_started_at_epoch double precision default null
) returns bigint
language plpgsql
security definer
as $function$
declare
  v_id bigint;
  v_prior_attempt_this_process boolean := false;
  v_process_started_at timestamptz;
  v_startup_started_at timestamptz;
  v_worker_ready_at timestamptz;
  v_billable_started_at timestamptz;
begin
  if p_process_started_at_epoch is not null then
    v_process_started_at := to_timestamp(p_process_started_at_epoch);

    select exists(
      select 1 from task_attempts
      where worker_id = p_worker_id and assigned_at >= v_process_started_at
    ) into v_prior_attempt_this_process;
  end if;

  if v_process_started_at is not null and not v_prior_attempt_this_process then
    v_startup_started_at := v_process_started_at;
    v_worker_ready_at := null;
    v_billable_started_at := null;
  else
    v_startup_started_at := null;
    v_worker_ready_at := now();
    v_billable_started_at := now();
  end if;

  insert into task_attempts (
    task_id, worker_id, lease_generation, assigned_at,
    startup_started_at, worker_ready_at, billable_started_at, status
  ) values (
    p_task_id, p_worker_id, p_generation, now(),
    v_startup_started_at, v_worker_ready_at, v_billable_started_at, 'in_progress'
  )
  returning id into v_id;

  return v_id;
end;
$function$;

comment on function public.start_task_attempt is
  'Phase 8 - goi ngay sau claim_task() thanh cong. Tao 1 dong task_attempts. Neu day la lan claim DAU TIEN cua process Python (p_process_started_at_epoch chua tung xuat hien o dong nao truoc do cua worker nay), tinh khoang tu process_started_at den worker_ready_at la "khoi dong". CHI ghi timestamp, KHONG tinh billable_seconds/tien.';

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
      billable_started_at = coalesce(billable_started_at, now())
  where task_id = p_task_id and worker_id = p_worker_id and lease_generation = p_generation
    and status = 'in_progress'
  returning id into v_id;
  return v_id is not null;
end;
$function$;

comment on function public.report_worker_ready is
  'Phase 8 - goi khi Worker THAT SU san sang render (ngay truoc frame dau tien). Neu start_task_attempt() da dat worker_ready_at/billable_started_at tu truoc (khong co pha khoi dong), coalesce() giu nguyen gia tri cu, khong ghi de.';

create or replace function public.report_task_attempt_stage(
  p_task_id bigint, p_worker_id text, p_generation integer, p_stage text
) returns boolean
language plpgsql
security definer
as $function$
declare v_id bigint;
begin
  if p_stage = 'render_completed' then
    update task_attempts set render_completed_at = coalesce(render_completed_at, now())
    where task_id = p_task_id and worker_id = p_worker_id and lease_generation = p_generation
      and status = 'in_progress'
    returning id into v_id;
  elsif p_stage = 'merge_completed' then
    update task_attempts set merge_completed_at = coalesce(merge_completed_at, now())
    where task_id = p_task_id and worker_id = p_worker_id and lease_generation = p_generation
      and status = 'in_progress'
    returning id into v_id;
  elsif p_stage = 'upload_completed' then
    update task_attempts set upload_completed_at = coalesce(upload_completed_at, now())
    where task_id = p_task_id and worker_id = p_worker_id and lease_generation = p_generation
      and status = 'in_progress'
    returning id into v_id;
  elsif p_stage = 'verification_completed' then
    update task_attempts set verification_completed_at = coalesce(verification_completed_at, now())
    where task_id = p_task_id and worker_id = p_worker_id and lease_generation = p_generation
      and status = 'in_progress'
    returning id into v_id;
  else
    return false;
  end if;
  return v_id is not null;
end;
$function$;

comment on function public.report_task_attempt_stage is
  'Phase 8 - ghi 1 moc thoi gian cho task_attempts dang in_progress. p_stage phai la 1 trong: render_completed/merge_completed/upload_completed/verification_completed (khac gia tri tra ve false, khong loi).';

create or replace function public.finalize_task_attempt(
  p_task_id bigint, p_worker_id text, p_generation integer, p_outcome text
) returns boolean
language plpgsql
security definer
as $function$
declare v_id bigint;
begin
  if p_outcome not in ('completed', 'failed', 'rejected') then
    return false;
  end if;

  update task_attempts
  set status = p_outcome,
      billable_ended_at = case when p_outcome = 'completed' then coalesce(billable_ended_at, now()) else billable_ended_at end,
      failure_reason = case when p_outcome != 'completed' then p_outcome else failure_reason end
  where task_id = p_task_id and worker_id = p_worker_id and lease_generation = p_generation
    and status = 'in_progress'
  returning id into v_id;

  return v_id is not null;
end;
$function$;

comment on function public.finalize_task_attempt is
  'Phase 8 - goi 1 LAN sau khi biet ket qua CUOI CUNG cua attempt nay (sau complete_task()/fail_task()). p_outcome: completed (billable_ended_at = luc nay) / failed / rejected (bi worker khac lay mat). Task_attempts bi "quen" finalize (worker chet giua chung) se duoc requeue_stale_tasks() (Phase 7, migration 005) tu dong danh dau superseded.';

-- ===== 4. Mo rong requeue_stale_tasks() (da co tu Phase 7, migration 005) -
-- danh dau task_attempts cu la 'superseded' khi task bi requeue do mat
-- heartbeat, tranh dong 'in_progress' mo coi vinh vien (Worker cu da chet,
-- khong bao gio goi finalize_task_attempt duoc nua) =====
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
        generation = generation + 1
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

      -- Phase 8 (migration 006): dong task_attempts cu (worker cu khong
      -- con co hoi tu finalize_task_attempt() nua vi da mat lien lac).
      update task_attempts
      set status = 'superseded'
      where task_id = v_row.id and worker_id = v_row.worker_id
        and lease_generation = v_row.generation and status = 'in_progress';
    end if;
  end loop;

  return v_requeued_count;
end;
$function$;

-- ===== 5. compute_host_usage_sessions() - ham tinh billing, KHONG BAO GIO
-- duoc Worker goi (chi cron goi, xem lich cron cuoi file). Day la ranh
-- gioi "Backend tinh tien" cua toan bo Phase 8. =====
create or replace function public.compute_host_usage_sessions()
returns integer
language plpgsql
security definer
as $function$
declare
  v_count int := 0;
  v_row record;
  v_hourly_rate numeric;
  v_startup_seconds numeric;
  v_waiting_seconds numeric;
  v_render_seconds numeric;
  v_merge_seconds numeric;
  v_upload_seconds numeric;
  v_verification_seconds numeric;
  v_billable_seconds numeric;
  v_status text;
  v_estimated_amount numeric;
begin
  for v_row in
    select ta.*
    from task_attempts ta
    where ta.status = 'completed'
      and not exists (select 1 from host_usage_sessions hus where hus.attempt_id = ta.id)
  loop
    select f.hourly_rate into v_hourly_rate
    from workers w join fleets f on f.id = w.fleet_id
    where w.worker_id = v_row.worker_id;

    v_startup_seconds := case when v_row.startup_started_at is not null and v_row.worker_ready_at is not null
      then greatest(0, extract(epoch from (v_row.worker_ready_at - v_row.startup_started_at))) else 0 end;
    v_waiting_seconds := case when v_row.worker_ready_at is not null and v_row.render_started_at is not null
      then greatest(0, extract(epoch from (v_row.render_started_at - v_row.worker_ready_at))) else 0 end;
    v_render_seconds := case when v_row.render_started_at is not null and v_row.render_completed_at is not null
      then greatest(0, extract(epoch from (v_row.render_completed_at - v_row.render_started_at))) else 0 end;
    v_merge_seconds := case when v_row.render_completed_at is not null and v_row.merge_completed_at is not null
      then greatest(0, extract(epoch from (v_row.merge_completed_at - v_row.render_completed_at))) else 0 end;
    v_upload_seconds := case when coalesce(v_row.merge_completed_at, v_row.render_completed_at) is not null and v_row.upload_completed_at is not null
      then greatest(0, extract(epoch from (v_row.upload_completed_at - coalesce(v_row.merge_completed_at, v_row.render_completed_at)))) else 0 end;
    v_verification_seconds := case when v_row.upload_completed_at is not null and v_row.verification_completed_at is not null
      then greatest(0, extract(epoch from (v_row.verification_completed_at - v_row.upload_completed_at))) else 0 end;

    v_billable_seconds := case when v_row.billable_started_at is not null and v_row.billable_ended_at is not null
      then greatest(0, extract(epoch from (v_row.billable_ended_at - v_row.billable_started_at))) else 0 end;

    if v_startup_seconds > 420 then
      v_status := 'decision_required';
    elsif v_hourly_rate is null then
      v_status := 'awaiting_rate';
    else
      v_status := 'computed';
    end if;

    v_estimated_amount := case when v_hourly_rate is not null then round((v_billable_seconds / 3600.0) * v_hourly_rate, 2) else null end;

    insert into host_usage_sessions (
      host_id, worker_id, task_id, attempt_id,
      startup_seconds, startup_grace_seconds, waiting_seconds, render_seconds,
      merge_seconds, upload_seconds, verification_seconds,
      billable_seconds, non_billable_seconds,
      hourly_rate, estimated_amount, final_amount, status
    ) values (
      null, v_row.worker_id, v_row.task_id, v_row.id,
      v_startup_seconds, 420, v_waiting_seconds, v_render_seconds,
      v_merge_seconds, v_upload_seconds, v_verification_seconds,
      v_billable_seconds, v_startup_seconds,
      v_hourly_rate, v_estimated_amount, null, v_status
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

comment on function public.compute_host_usage_sessions is
  'Phase 8 - CHI duoc goi qua cron (compute-host-usage-sessions, moi 5 phut), KHONG BAO GIO duoc Worker goi truc tiep - day la ranh gioi "Worker khong duoc tu quyet dinh billing". Tinh 1 dong host_usage_sessions cho MOI task_attempts vua completed chua duoc tinh. final_amount LUON null (can hanh dong Admin rieng, ngoai pham vi vong nay).';

-- ===== 6. Cron moi (5 phut/lan - it khan cap hon 2 cron 2-phut da co,
-- day la bao cao/thong ke, khong anh huong dispatch/fencing that) =====
select cron.schedule(
  'compute-host-usage-sessions',
  '*/5 * * * *',
  $$select compute_host_usage_sessions();$$
);

-- ===== ROLLBACK (chay tay neu can) =====
-- select cron.unschedule('compute-host-usage-sessions');
-- drop function if exists public.compute_host_usage_sessions();
-- drop function if exists public.finalize_task_attempt(bigint, text, integer, text);
-- drop function if exists public.report_task_attempt_stage(bigint, text, integer, text);
-- drop function if exists public.report_worker_ready(bigint, text, integer);
-- drop function if exists public.start_task_attempt(bigint, text, integer, double precision);
-- drop table if exists public.host_usage_sessions;
-- alter table public.fleets drop column if exists hourly_rate;
-- (requeue_stale_tasks() ve lai ban Phase 7 - xem worker_migrations/005_...)
