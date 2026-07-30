-- CWS Worker Fleet — Phase 6 (CWS_WORKER_ROADMAP.md): bang worker_incidents
-- + RPC report_worker_incident() de Admin Dashboard loc/theo doi su co that
-- (worker crash, merge fail, ...) thay vi phai doc rai rac last_crash_message/
-- crash_count tren bang workers (khong loc duoc theo severity/thoi gian/task,
-- khong biet "da xu ly hay chua").
--
-- MO RONG TREN NEN CO (dung quyet dinh Dy 31/07/2026 cho migration 001):
-- KHONG thay the report_worker_crash() hien co (van chay that, van cap nhat
-- workers.crash_count/last_crash_message - Backend dang doc qua listWorkers()).
-- Migration nay THEM report_worker_crash() goi THEM report_worker_incident()
-- o cuoi, de moi lan crash THAT (co san tu truoc, dang chay that) TU DONG
-- co 1 dong trong worker_incidents ma KHONG CAN sua cws_worker_full.py -
-- giam toi da rui ro (khong them code Python nao cho incident WORKER_CRASH).

-- ===== 1. worker_incidents (Phase 6 section 9 + section "worker_incidents") =====
create table if not exists public.worker_incidents (
  id bigint generated always as identity primary key,
  worker_id text references public.workers(worker_id),
  host_id text,
  task_id bigint references public.tasks(id),
  attempt_id bigint references public.task_attempts(id),
  event_type text not null,
  severity text not null default 'error',
  error_code text,
  summary text not null,
  details jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  occurrence_count integer not null default 1,
  resolved_at timestamptz,
  resolution text
);

create index if not exists idx_worker_incidents_worker_id on public.worker_incidents (worker_id);
create index if not exists idx_worker_incidents_task_id on public.worker_incidents (task_id);
create index if not exists idx_worker_incidents_severity on public.worker_incidents (severity);
create index if not exists idx_worker_incidents_last_seen_at on public.worker_incidents (last_seen_at desc);
create index if not exists idx_worker_incidents_open on public.worker_incidents (resolved_at) where resolved_at is null;

comment on table public.worker_incidents is
  'Phase 6 CWS_WORKER_ROADMAP.md - danh sach su co Worker Fleet (crash/merge fail/...), ghi qua RPC report_worker_incident(). host_id/attempt_id de nullable (schema hien tai 1 worker = 1 may vat ly, task_attempts chua duoc Worker ghi - xem worker_migrations/001_...).';

-- ===== 2. RPC report_worker_incident() - upsert dedup theo incident CHUA resolve =====
-- Dedup key: worker_id + event_type + error_code (null-safe) + task_id (null-safe),
-- CHI xet cac incident CHUA resolved_at (incident da resolve thi lan sau
-- xay ra lai se tao dong MOI, khong cong don vao dong cu da dong).
create or replace function public.report_worker_incident(
  p_worker_id text,
  p_task_id bigint default null,
  p_event_type text default null,
  p_severity text default 'error',
  p_error_code text default null,
  p_summary text default null,
  p_details jsonb default null
) returns bigint
language plpgsql
security definer
as $function$
declare
  v_id bigint;
begin
  if p_event_type is null or p_summary is null then
    return null;
  end if;

  select id into v_id
  from worker_incidents
  where worker_id is not distinct from p_worker_id
    and event_type = p_event_type
    and error_code is not distinct from p_error_code
    and task_id is not distinct from p_task_id
    and resolved_at is null
  order by last_seen_at desc
  limit 1;

  if v_id is not null then
    update worker_incidents
    set occurrence_count = occurrence_count + 1,
        last_seen_at = now(),
        summary = p_summary,
        details = coalesce(p_details, details),
        severity = p_severity
    where id = v_id;
    return v_id;
  end if;

  insert into worker_incidents (
    worker_id, task_id, event_type, severity, error_code, summary, details
  ) values (
    p_worker_id, p_task_id, p_event_type, coalesce(p_severity, 'error'), p_error_code, p_summary, p_details
  ) returning id into v_id;

  return v_id;
end;
$function$;

-- ===== 3. Mo rong report_worker_crash() da co san - THEM ghi worker_incidents =====
-- Giu nguyen TOAN BO logic cu (update workers.crash_count/last_crash_at/
-- last_crash_message - Backend dang doc qua WorkerFleetGateway.listWorkers()),
-- CHI them 1 loi goi report_worker_incident() o cuoi. cws_worker_full.py
-- KHONG can sua gi (van goi report_worker_crash() y nhu cu tu truoc).
create or replace function public.report_worker_crash(p_worker_id text, p_error_message text)
returns void
language plpgsql
security definer
as $function$
begin
    update workers
    set crash_count = crash_count + 1,
        last_crash_at = now(),
        last_crash_message = left(p_error_message, 2000)
    where worker_id = p_worker_id;

    perform public.report_worker_incident(
      p_worker_id => p_worker_id,
      p_task_id => null,
      p_event_type => 'WORKER_CRASH',
      p_severity => 'critical',
      p_error_code => null,
      p_summary => left(p_error_message, 500),
      p_details => jsonb_build_object('error_message', p_error_message)
    );
end;
$function$;

-- ===== 4. RLS - bat, KHONG tao policy (dung quy uoc da xac nhan cho worker_leases/
-- worker_state_events/task_attempts o migration 001: bang noi bo, CHI truy cap
-- qua RPC SECURITY DEFINER/service_role, khong co truy cap truc tiep tu anon/authenticated) =====
alter table public.worker_incidents enable row level security;

-- ===== ROLLBACK (chay tay neu can, giu thu tu nguoc lai) =====
-- create or replace function public.report_worker_crash(p_worker_id text, p_error_message text)
-- returns void language plpgsql security definer as $function$
-- begin
--     update workers set crash_count = crash_count + 1, last_crash_at = now(),
--       last_crash_message = left(p_error_message, 2000) where worker_id = p_worker_id;
-- end;
-- $function$;
-- drop function if exists public.report_worker_incident(text, bigint, text, text, text, text, jsonb);
-- drop table if exists public.worker_incidents;
