-- CWS Worker Fleet — Phase 3 (CWS_WORKER_ROADMAP.md): schema cho state
-- machine Worker (desired_state/observed_state tach biet) + bang moi
-- worker_leases/worker_state_events/task_attempts.
--
-- BOI CANH QUAN TRONG (phat hien qua doc truc tiep RPC/cron dang chay
-- that tren Supabase truoc khi viet migration nay, theo dung yeu cau
-- "khong doan schema, phai tim RPC/migration lien quan"):
--   - `mark_stale_workers_offline()` (pg_cron, moi 2 phut, nguong 180s)
--     va `requeue_stale_tasks()` (pg_cron, moi 2 phut, nguong 240s,
--     tang tasks.generation) DA TON TAI VA DANG CHAY THAT - migration
--     nay KHONG thay the/tat 2 co che do (theo quyet dinh cua Dy
--     31/07/2026: "mo rong tren nen co", khong lam gian doan dich vu
--     dang chay that voi du lieu that: 27 worker, 713 task).
--   - `update_task_stage()` RPC da ton tai, ghi vao dung 2 cot
--     tasks.current_stage/stage_entered_at (cung da co san) - nhung
--     cws_worker_full.py CHUA TUNG goi RPC nay (tich hop dang do tu
--     truoc). Migration nay KHONG dong vao 2 cot do cua bang tasks.
--
-- Day la file migration DAU TIEN cho domain Worker Fleet (jobs/tasks/
-- workers/fleets/partners) - domain nay TRUOC GIO chua duoc version-
-- control trong git (chi ton tai truc tiep tren Supabase, ap dung tay
-- qua SQL Editor). Thu muc worker_migrations/ (rieng biet voi
-- backend/migrations/, von chi quan ly domain MVP: render_orders/
-- payments/customer_profiles...) duoc lap ra tu file nay de bat dau
-- theo doi domain Worker Fleet trong git, dung nhu roadmap Phase 3
-- yeu cau "Yeu cau migration: backward-compatible, co rollback".
--
-- TOAN BO thay doi trong file nay la ADD-ONLY (them cot nullable/them
-- bang moi) - KHONG DROP/RENAME bat ky cot/bang nao dang co, KHONG anh
-- huong du lieu dang chay that. An toan de chay ngay ca khi Phase 3
-- (wiring code Python/Backend doc-ghi cac cot moi nay) chua lam xong -
-- cac cot/bang moi se don gian la chua duoc dung toi cho den luc do.

-- ===== 1. Mo rong bang workers voi state machine (Phase 3 section 12) =====
-- Tat ca cot moi deu nullable, KHONG co default rang buoc hanh vi cu -
-- workers.status (idle/busy/offline) van la nguon su that chinh cho
-- toi khi code Worker/Backend thuc su doc/ghi desired_state/observed_state.
alter table public.workers
  add column if not exists desired_state text,
  add column if not exists observed_state text,
  add column if not exists health_state text,
  add column if not exists current_task_id bigint references public.tasks(id),
  add column if not exists current_generation integer,
  add column if not exists boot_id text,
  add column if not exists session_id text,
  add column if not exists agent_version text,
  add column if not exists worker_version text,
  add column if not exists last_transition_at timestamptz,
  add column if not exists state_reason text;

comment on column public.workers.desired_state is
  'Trang thai Scheduler/Backend MUON worker o (Phase 3 roadmap) - tach biet voi observed_state. Chua co code nao ghi cot nay (Phase 3 wiring chua lam), du sau khi them cot.';
comment on column public.workers.observed_state is
  'Trang thai Worker/Agent TU BAO CAO la dang o (Phase 3 roadmap). Chua co code nao ghi cot nay.';
comment on column public.workers.health_state is
  'vd DEGRADED/QUARANTINED/OK - doc lap voi observed_state (1 worker co the dang RENDERING nhung health_state=DEGRADED vi crash_count cao).';

create index if not exists idx_workers_observed_state on public.workers (observed_state);
create index if not exists idx_workers_current_task_id on public.workers (current_task_id);

-- ===== 2. worker_leases (Phase 3 section 12) =====
-- Theo doi lease/session cua TUNG lan Worker khoi dong (boot_id) - dung
-- de sau nay phat hien "Worker cu quay lai" (vd may restart nhung van
-- con tien trinh cu treo) qua sequence_number tang dan, KHONG PHAI thay
-- the cho generation cua tasks (khai niem khac: generation la fencing
-- token CUA TUNG TASK, con lease o day la CUA TUNG PHIEN WORKER).
create table if not exists public.worker_leases (
  id bigint generated always as identity primary key,
  worker_id text not null references public.workers(worker_id),
  boot_id text not null,
  session_id text,
  sequence_number integer not null default 1,
  renewed_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '300 seconds')
);

create index if not exists idx_worker_leases_worker_id on public.worker_leases (worker_id);
create index if not exists idx_worker_leases_expires_at on public.worker_leases (expires_at);

comment on table public.worker_leases is
  'Phase 3/7 CWS_WORKER_ROADMAP.md - theo doi phien lam viec (boot) cua tung Worker, phuc vu chong zombie/split-brain o muc WORKER (khac fencing token o muc TASK da co san qua tasks.generation). Chua co code Python/Backend nao ghi/doc bang nay (chi tao schema truoc, Phase 3 wiring se dung sau).';

-- ===== 3. worker_state_events (Phase 3 section 12) =====
-- Nhat ky MOI LAN chuyen trang thai cua 1 worker - phuc vu Admin
-- Dashboard (Phase 5) xem lai lich su, KHONG PHAI ghi 1 dong cho MOI
-- heartbeat (heartbeat phai nhe, xem nguyen tac Phase 5 "khong tao log
-- DB cho tung heartbeat") - chi ghi khi THAT SU doi trang thai.
create table if not exists public.worker_state_events (
  id bigint generated always as identity primary key,
  worker_id text not null references public.workers(worker_id),
  host_id text, -- chua co khai niem "host" tach biet voi worker_id trong schema hien tai (1 worker = 1 may) - de nullable, du dung sau neu Phase 5 can phan biet nhieu worker/1 host vat ly.
  task_id bigint references public.tasks(id),
  from_state text,
  to_state text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_worker_state_events_worker_id on public.worker_state_events (worker_id, created_at desc);

comment on table public.worker_state_events is
  'Phase 3 CWS_WORKER_ROADMAP.md - nhat ky chuyen trang thai worker, phuc vu Admin Dashboard (Phase 5) xem lich su. Chua co code nao ghi bang nay (Phase 3 wiring se dung sau).';

-- ===== 4. task_attempts (Phase 3/8 section 12) =====
-- Ghi lai TUNG LAN 1 worker claim 1 task (1 task co the co NHIEU dong o
-- day qua nhieu lan requeue/generation khac nhau) - phuc vu ca dieu tra
-- su co (Phase 6) lan thong ke thoi gian thue chinh xac (Phase 8, cac
-- moc thoi gian billable_started_at.../billable_ended_at). KHONG thay
-- the tasks.generation (van la nguon su that cho fencing token thuc
-- thi trong RPC hien tai) - bang nay la LICH SU chi tiet hon, tach biet.
create table if not exists public.task_attempts (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id),
  worker_id text not null references public.workers(worker_id),
  lease_generation integer not null,
  fencing_token_hash text,
  assigned_at timestamptz not null default now(),
  startup_started_at timestamptz,
  worker_ready_at timestamptz,
  billable_started_at timestamptz,
  render_started_at timestamptz,
  render_completed_at timestamptz,
  merge_completed_at timestamptz,
  upload_completed_at timestamptz,
  verification_completed_at timestamptz,
  billable_ended_at timestamptz,
  status text,
  failure_reason text
);

create index if not exists idx_task_attempts_task_id on public.task_attempts (task_id);
create index if not exists idx_task_attempts_worker_id on public.task_attempts (worker_id);

comment on table public.task_attempts is
  'Phase 3/8 CWS_WORKER_ROADMAP.md - lich su chi tiet tung lan claim 1 task (khac tasks.generation - do la fencing token dang dung THAT trong RPC hien tai, khong doi). Chua co code nao ghi bang nay (Phase 3 wiring + Phase 8 billing se dung sau). Worker KHONG duoc tu ghi billable_*_at/status thanh cong cuoi cung - Backend/Scheduler moi la noi quyet dinh billing that (dung nguyen tac roadmap Phase 8 "Worker khong duoc tinh tien").';

-- ===== ROLLBACK (chay tay neu Phase 3 gay loi, giu nguyen thu tu nguoc lai) =====
-- drop table if exists public.task_attempts;
-- drop table if exists public.worker_state_events;
-- drop table if exists public.worker_leases;
-- alter table public.workers
--   drop column if exists desired_state,
--   drop column if exists observed_state,
--   drop column if exists health_state,
--   drop column if exists current_task_id,
--   drop column if exists current_generation,
--   drop column if exists boot_id,
--   drop column if exists session_id,
--   drop column if exists agent_version,
--   drop column if exists worker_version,
--   drop column if exists last_transition_at,
--   drop column if exists state_reason;
