-- CWS Worker Fleet - sua lo hong goc re khien luong end-to-end khong
-- bao gio hoan thanh: KHONG co code nao (Python lan RPC) tung ghi
-- jobs.total_frames cho job tao qua Backend hien tai.
--
-- DA XAC NHAN qua doc truc tiep code/RPC that (khong doan):
--   - analyze_blend_scene() (Scene Analyzer trong cws_worker_full.py)
--     KHONG doc scene.frame_start/scene.frame_end, khong tinh total_frames.
--   - RPC DUY NHAT tung ghi jobs.total_frames la create_job_with_chunks()
--     (legacy) - nhung no doi hoi total_frames BIET TRUOC luc tao job
--     (chunking_status='probing' ngay tu dau), trong khi Backend hien
--     tai tao job qua WorkerFleetGateway.createInternalJobWithProbeTask()
--     KHONG biet total_frames truoc (chinh la ly do can Scene Analyzer).
--   - report_render_speed() (RPC tao cac task con lai) chi chay khi
--     chunking_status='probing' - khong bao gio dung voi job Backend
--     tao (mac dinh 'pending'), nen KHONG BAO GIO tao duoc task ngoai
--     probe task cho du Worker co online hay khong.
--   - Xac nhan qua du lieu that: ca 3 render_orders hien co deu dung
--     yen o dung 1 task (total_frames=null, chunking_status='pending').
--
-- Backend (SchedulerService.processOrder(), khong doi trong migration
-- nay) DA CO SAN co che tu tao cac task con lai dung khi
-- WorkerFleetGateway.getTotalFrames() tra ve gia tri khac null - chi
-- CAN 1 duong de Worker bao lai total_frames/fps that sau khi Scene
-- Analyzer chay xong. RPC nay la duong do.
--
-- Idempotent (chi ghi khi jobs.total_frames dang NULL - worker dau tien
-- toi truoc thang, giong dung tinh than "Phuong an C" cua
-- set_optimization_plan_if_missing) + yeu cau worker goi PHAI dang giu
-- 1 task active cua CHINH job do (khong cho worker la, khong lien quan
-- job, tu y ghi de).
--
-- CHUA CO code Python nao goi RPC nay (cws_worker_full.py can wiring
-- them - cho ban dung 1.16.5 upload xong moi lam, tranh sua nham tren
-- baseline cu 1.14.0). RPC nay AN TOAN de tao truoc, khong anh huong
-- gi neu chua co ai goi toi.
create or replace function public.set_job_total_frames(
  p_job_id text,
  p_worker_id text,
  p_total_frames integer,
  p_fps numeric default null
) returns boolean
language plpgsql
security definer
as $function$
declare
  v_updated_count int;
begin
  if p_total_frames is null or p_total_frames < 1 then
    return false;
  end if;

  update jobs
  set total_frames = p_total_frames,
      fps = coalesce(p_fps, fps)
  where id = p_job_id
    and total_frames is null
    and exists (
      select 1 from tasks t
      where t.job_id = p_job_id
        and t.worker_id = p_worker_id
        and t.status = 'active'
    );

  get diagnostics v_updated_count = row_count;
  return v_updated_count > 0;
end;
$function$;

comment on function public.set_job_total_frames is
  'Sua lo hong: khong co code nao tung ghi jobs.total_frames cho job tao qua Backend (createInternalJobWithProbeTask), khien SchedulerService khong bao gio tu tao duoc task ngoai probe task. Worker goi RPC nay SAU KHI Scene Analyzer xac dinh duoc scene.frame_start/frame_end that (can wiring them ben Python, chua lam - cho baseline 1.16.5). Idempotent (chi ghi neu dang NULL) + yeu cau worker dang giu 1 task active cua dung job do.';

-- ===== ROLLBACK (chay tay neu can) =====
-- drop function if exists public.set_job_total_frames(text, text, integer, numeric);
