-- CWS Worker Fleet — Ngoai pham vi CWS_WORKER_ROADMAP.md, dong 1 "GIOI HAN
-- DA BIET" duoc chinh attempt_job_video_merge() ghi ro trong docstring
-- (Phase 2, cws_worker_full.py): neu 2 Worker cung hoan thanh 2 task cuoi
-- cung cua CUNG 1 job gan nhu dong thoi, CA HAI co the cung thay
-- is_fully_done=true va CA HAI cung thu merge song song (lang phi ffmpeg
-- + upload B2 2 lan cho cung 1 video). Gioi han nay duoc ghi ro la KHONG
-- PHAI hoi quy moi (cws_auto_ghep_video.bat thu cong cung co han che
-- tuong tu neu 2 nguoi cung chay tay) - nhung gio co the dong duoc de
-- tranh lang phi tai nguyen that.
--
-- CHI Postgres + 1 diem goi Python toi thieu - dung "khoa lac quan"
-- (optimistic lock) qua 1 cot moi tren bang jobs, KHONG dung
-- pg_advisory_lock (khong phu hop vi lock phai song suot thoi gian merge
-- Python chay, ngoai pham vi 1 cau lenh SQL/1 ket noi RPC).

alter table public.jobs add column if not exists merge_lock_at timestamptz;
comment on column public.jobs.merge_lock_at is
  'Chong 2 Worker cung merge song song cho CUNG 1 job (xem attempt_job_video_merge() "GIOI HAN DA BIET"). Set qua try_acquire_merge_lock() - worker DAU TIEN dat duoc gia tri nay se la worker DUY NHAT tiep tuc merge, worker sau se tu bo qua.';

create or replace function public.try_acquire_merge_lock(p_job_id text)
returns boolean
language plpgsql
security definer
as $function$
declare v_count int;
begin
  update jobs
  set merge_lock_at = now()
  where id = p_job_id and merge_lock_at is null;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$function$;

comment on function public.try_acquire_merge_lock is
  'Khoa lac quan - worker goi truoc khi bat dau merge THAT SU (sau khi da xac nhan is_fully_done + total_frames > 1 + co fps). Tra ve true = worker nay duoc quyen merge (chi 1 worker duy nhat nhan true cho MOI job, do UPDATE ... WHERE merge_lock_at is null la atomic). Tra ve false = worker khac da/dang merge, worker nay BO QUA lan nay (khong phai loi).';

-- ===== ROLLBACK =====
-- drop function if exists public.try_acquire_merge_lock(text);
-- alter table public.jobs drop column if exists merge_lock_at;
