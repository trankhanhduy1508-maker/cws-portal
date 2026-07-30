-- CWS Worker Fleet — Sua loi TU CHINH MINH gay ra o migration 010 (phat
-- hien ngay sau khi apply, TRUOC khi anh huong du lieu that): try_acquire_merge_lock()
-- LUON giu khoa vinh vien ke ca khi lan merge do THAT BAI (vd tai
-- get_job_render_summary()#is_fully_done co the tra ve true SOM (chi dua
-- tren cac task DANG TON TAI trong bang tasks) - ngay sau khi probe task
-- (1 frame) xong nhung TRUOC KHI createRemainingTasks() (Backend) kip
-- chen cac task con lai, is_fully_done se tra ve true "gia" (thuc te chi
-- co 1/N frame that). attempt_job_video_merge() da tu bat loi nay qua
-- kiem tra "so file PNG khong khop" (downloaded != total_frames) va bo
-- qua an toan - TRUOC KHI co khoa (migration 010), dieu nay vo hai vi
-- lan sau (khi job THAT SU xong) se thu lai binh thuong. NHUNG voi khoa
-- vinh vien moi them, lan thu "gia" nay se KHOA VINH VIEN job do, khien
-- lan merge THAT SU (sau nay) khong bao gio duoc thuc hien tu dong nua.
--
-- Sua: them release_merge_lock() - Python goi trong `finally` NEU merge
-- KHONG thanh cong that su (bat ky ly do gi: mismatch/ffmpeg loi/output
-- rong/exception) - CHI giu khoa khi that su tra ve "success". Dam bao
-- lan merge THAT SU sau nay (khi job da that su xong) van thu duoc.

create or replace function public.release_merge_lock(p_job_id text)
returns void
language plpgsql
security definer
as $function$
begin
  update jobs set merge_lock_at = null where id = p_job_id;
end;
$function$;

comment on function public.release_merge_lock is
  'Sua loi try_acquire_merge_lock() (migration 010) giu khoa vinh vien ke ca khi merge that bai. Python (attempt_job_video_merge()) goi trong finally NEU merge KHONG thanh cong that su, de lan sau (khi job THAT SU xong) van thu merge lai duoc.';

-- ===== ROLLBACK =====
-- drop function if exists public.release_merge_lock(text);
