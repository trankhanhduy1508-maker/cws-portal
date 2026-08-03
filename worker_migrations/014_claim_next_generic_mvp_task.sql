-- P0 fix (2026-08-03, Owner uy quyen truc tiep): Worker hien tai
-- (cws_worker_full.py) CHI claim_task() qua danh sach JOB_IDS_MULTI
-- hardcode san (job kinh doanh rieng cua Owner) - KHONG BAO GIO tu
-- claim duoc job MVP that do khach tao qua Portal (WorkerFleetGateway.
-- createInternalJobWithProbeTask(), id = randomUUID()). Xac nhan bang
-- evidence that (2026-08-03): 6 job MVP that (id dang UUID, blend_file
-- la link Google Drive khach), moi job 1 task 'queued', NAM CHO tu
-- 2026-07-27 den 2026-07-31 (nhieu ngay) ma khong Worker nao claim -
-- xem reports/worker/CWS_GENERIC_JOB_CLAIM_FIX_2026-08-03.md.
--
-- Migration nay CHI THEM ham moi (KHONG sua/xoa claim_task() hien co) -
-- an toan tuyet doi voi Fleet dang chay that cua Owner (JOB_IDS_MULTI
-- van claim qua claim_task() y het truoc gio, khong doi hanh vi).
--
-- Phan biet "job MVP that (Portal)" vs "job Owner tu tay cau hinh"
-- KHONG dung danh sach loai tru (se lech theo thoi gian, Owner da doi
-- JOB_IDS_MULTI nhieu lan) - dung dac diem CAU TRUC co san: job Portal
-- LUON co id dang UUID (randomUUID() ben Backend), job Owner tu go tay
-- LUON la ten nguoi doc duoc (CWS-JOB3, CWS-JOB4-PHONG5...) - xac nhan
-- THAT qua truy van production (2026-08-03): TOAN BO job hien co phan
-- tach 100% theo dung quy tac nay, khong co ngoai le.
create or replace function public.claim_next_generic_task(
  p_worker_id text,
  p_worker_vram_mb integer default null::integer
)
returns table(task_id bigint, out_job_id text, out_frame_start integer, out_frame_end integer, out_generation integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_task_id bigint;
    v_job_id text;
    v_frame_start int;
    v_frame_end int;
    v_generation int;
    v_health_state text;
    v_desired_state text;
begin
    -- Giu dung hanh vi quarantine/drain nhu claim_task() (migration 008).
    select health_state, desired_state into v_health_state, v_desired_state
    from workers where worker_id = p_worker_id;

    if v_health_state = 'QUARANTINED' or v_desired_state = 'DRAINING' then
        return;
    end if;

    -- Uu tien 1: task chua bi CHINH worker nay fail lan cuoi (dung logic
    -- giong claim_task()), CHI trong pham vi job id dang UUID.
    update tasks
    set status = 'active', worker_id = p_worker_id,
        claimed_at = now(), last_heartbeat = now()
    where id = (
        select t.id from tasks t
        where t.job_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          and t.status = 'queued'
          and (t.min_vram_mb is null or (p_worker_vram_mb is not null and t.min_vram_mb <= p_worker_vram_mb))
          and (t.failed_by is null or not (p_worker_id = t.failed_by[array_upper(t.failed_by,1)]))
        order by t.claimed_at nulls first, t.id
        limit 1
        for update skip locked
    )
    returning tasks.id, tasks.job_id, tasks.frame_start, tasks.frame_end, tasks.generation
    into v_task_id, v_job_id, v_frame_start, v_frame_end, v_generation;

    -- Fallback: cho claim du da tung fail truoc do (giong het chinh sach
    -- claim_task()) - tot hon la de task nam yen mai khong ai render.
    if v_task_id is null then
        update tasks
        set status = 'active', worker_id = p_worker_id,
            claimed_at = now(), last_heartbeat = now()
        where id = (
            select t.id from tasks t
            where t.job_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              and t.status = 'queued'
              and (t.min_vram_mb is null or (p_worker_vram_mb is not null and t.min_vram_mb <= p_worker_vram_mb))
            order by t.id
            limit 1
            for update skip locked
        )
        returning tasks.id, tasks.job_id, tasks.frame_start, tasks.frame_end, tasks.generation
        into v_task_id, v_job_id, v_frame_start, v_frame_end, v_generation;
    end if;

    if v_task_id is not null then
        update workers set status = 'busy', last_seen_at = now()
        where worker_id = p_worker_id;
    end if;

    return query select v_task_id, v_job_id, v_frame_start, v_frame_end, v_generation;
end;
$function$;

comment on function public.claim_next_generic_task is
  'P0 fix 2026-08-03: cho Worker claim task cua job MVP that (Portal, id dang UUID) KHONG can biet job_id truoc - bo sung claim_task() (chi claim theo 1 job_id cu the), KHONG thay the. Worker Python (cws_worker_full.py) goi ham nay CHI SAU KHI da thu het JOB_IDS_MULTI (job Owner tu cau hinh) khong con task nao - job Owner luon uu tien truoc, khong doi hanh vi Fleet hien tai. Job claim qua ham nay PHAI render KHONG --enable-autoexec o phia Python (file .blend tu khach upload la untrusted input) - xem reports/worker/CWS_GENERIC_JOB_CLAIM_FIX_2026-08-03.md.';
