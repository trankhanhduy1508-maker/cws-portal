import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * LỚP DUY NHẤT trong toàn bộ Backend được phép chạm vào bảng `jobs` và
 * `tasks` — 2 bảng NỘI BỘ mà cws_worker_full.py (Worker Fleet) đang
 * dùng để claim_task/render/upload. TUYỆT ĐỐI không sửa schema 2 bảng
 * này, không đổi logic Worker — chỉ INSERT dữ liệu mới theo ĐÚNG cách
 * Dy đã từng làm thủ công qua Supabase SQL Editor (job CWS-JOB5).
 *
 * Đây chính là điểm nối giữa "RenderOrder" (khái niệm phía Customer
 * Portal) và "Job/Task" (khái niệm phía Worker Fleet) — Model 1 hoạt
 * động chỉ nhờ đúng bước insert này, KHÔNG cần bất kỳ thay đổi nào ở
 * cws_worker_full.py, vì claim_task() hiện có đã tự động nhặt task mới.
 */
@Injectable()
export class WorkerFleetGateway {
  private readonly logger = new Logger(WorkerFleetGateway.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Tạo 1 job nội bộ cho Worker Fleet + 1 task "probe" (frame 1-1) để
   * Worker chạy Scene Analyzer lấy total_frames thật — đúng quy trình
   * đã dùng thủ công cho CWS-JOB5. Trả về internalJobId (= chính id
   * truyền vào, vì bảng `jobs` dùng text id tự đặt tên, không phải
   * uuid tự sinh).
   */
  async createInternalJobWithProbeTask(params: {
    internalJobId: string;
    blendLink: string;
    blendFile: string;
  }): Promise<string> {
    const client = this.supabaseService.getClient();

    const { error: jobError } = await client.from('jobs').insert({
      id: params.internalJobId,
      blend_link: params.blendLink,
      blend_file: params.blendFile,
    });

    if (jobError) {
      this.logger.error(`Tạo internal job thất bại: ${jobError.message}`);
      throw new Error(
        `Không tạo được job cho Worker Fleet: ${jobError.message}`,
      );
    }

    const { error: taskError } = await client.from('tasks').insert({
      job_id: params.internalJobId,
      frame_start: 1,
      frame_end: 1,
      status: 'queued',
    });

    if (taskError) {
      this.logger.error(`Tạo probe task thất bại: ${taskError.message}`);
      throw new Error(
        `Không tạo được task cho Worker Fleet: ${taskError.message}`,
      );
    }

    return params.internalJobId;
  }

  /**
   * Đọc trạng thái tổng hợp các task của 1 internal job — dùng để
   * Scheduler suy ra RenderOrder.status (searching_workers/rendering/...)
   * từ trạng thái THỰC THI thật của Worker Fleet (queued/active/done/...).
   */
  async getTaskSummary(internalJobId: string): Promise<{
    totalTasks: number;
    doneTasks: number;
    activeTasks: number;
    hasAnyWorkerClaimed: boolean;
  }> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('tasks')
      .select('status, worker_id')
      .eq('job_id', internalJobId);

    if (error) {
      this.logger.error(
        `getTaskSummary(${internalJobId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không đọc được trạng thái task: ${error.message}`);
    }

    const rows = (data ?? []) as { status: string; worker_id: string | null }[];
    return {
      totalTasks: rows.length,
      doneTasks: rows.filter((r) => r.status === 'done').length,
      activeTasks: rows.filter((r) => r.status === 'active').length,
      hasAnyWorkerClaimed: rows.some((r) => r.worker_id !== null),
    };
  }

  /** Danh sách Worker Fleet — Admin theo dõi "Worker"
   * (CWS_MVP_WORKFLOW_FINAL.md, mục Admin). CHỈ đọc, không sửa gì lên
   * bảng `workers` (đúng nguyên tắc "không đụng Worker Fleet").
   *
   * `observedState`/`stateReason`/`lastTransitionAt` (Phase 5
   * CWS_WORKER_ROADMAP.md, thêm 31/07/2026) đọc từ các cột mới của
   * Phase 3 (migration `worker_migrations/001_...`, Worker ghi qua RPC
   * `report_worker_state_transition` — xem `cws_worker_full.py#report_state()`).
   * CHỈ hiển thị THÊM, không thay thế `status` (idle/busy/offline) hiện
   * có — đó vẫn là nguồn sự thật chính (do cron `mark_stale_workers_offline`
   * duy trì), `observedState` là lớp chi tiết hơn ở BÊN CẠNH, có thể null
   * nếu Worker đang chạy bản cũ chưa có tính năng này. */
  async listWorkers(): Promise<
    {
      workerId: string;
      gpuName: string | null;
      vramMb: number | null;
      status: string;
      lastSeenAt: number;
      crashCount: number;
      observedState: string | null;
      stateReason: string | null;
      lastTransitionAt: number | null;
    }[]
  > {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('workers')
      .select(
        'worker_id, gpu_name, vram_mb, status, last_seen_at, crash_count, observed_state, state_reason, last_transition_at',
      )
      .order('last_seen_at', { ascending: false });

    if (error) {
      this.logger.error(`listWorkers() thất bại: ${error.message}`);
      throw new Error(`Không đọc được danh sách Worker: ${error.message}`);
    }
    return (data ?? []).map((r) => {
      const row = r as {
        worker_id: string;
        gpu_name: string | null;
        vram_mb: number | null;
        status: string;
        last_seen_at: string;
        crash_count: number;
        observed_state: string | null;
        state_reason: string | null;
        last_transition_at: string | null;
      };
      return {
        workerId: row.worker_id,
        gpuName: row.gpu_name,
        vramMb: row.vram_mb,
        status: row.status,
        lastSeenAt: new Date(row.last_seen_at).getTime(),
        crashCount: row.crash_count,
        observedState: row.observed_state,
        stateReason: row.state_reason,
        lastTransitionAt: row.last_transition_at
          ? new Date(row.last_transition_at).getTime()
          : null,
      };
    });
  }

  /** Số lượng Worker đang online (last_seen_at gần đây) — dùng cho
   * Scheduler Model 1 (đủ máy Online thì không cần Wake).
   *
   * Ngưỡng mặc định 180s — KHÔNG được để thấp hơn nhịp heartbeat thật
   * của Worker (xem CWS_WORKER_ROADMAP.md Phase 1 audit): lúc RẢNH,
   * cws_worker_full.py gọi worker_ping() mỗi 15s (POLL_INTERVAL_SEC),
   * nhưng lúc ĐANG RENDER, chỉ gọi mỗi 60s (HEARTBEAT_INTERVAL_SEC, qua
   * thread heartbeat_loop). Ngưỡng cũ 30s khiến 1 Worker đang render
   * (bận, không rảnh) có tới ~50% khả năng bị đếm nhầm là "offline" tại
   * bất kỳ thời điểm query nào — gây nhấp nháy trạng thái ALLOCATING_
   * WORKERS/SEARCHING_WORKERS ở SchedulerService và ước tính hàng đợi
   * sai ở JobsService.estimate(). 180s khớp đúng ngưỡng đã dùng thật ở
   * `mark_stale_workers_offline()` (cron 2 phút trên Supabase) và RPC
   * `count_active_workers()` (chưa được Backend dùng tới, cùng ngưỡng
   * 180s) — đồng bộ 1 chuẩn duy nhất cho toàn hệ thống thay vì mỗi nơi
   * tự chọn 1 con số khác nhau. */
  async countOnlineWorkers(withinSeconds = 180): Promise<number> {
    const client = this.supabaseService.getClient();
    const since = new Date(Date.now() - withinSeconds * 1000).toISOString();
    const { count, error } = await client
      .from('workers')
      .select('worker_id', { count: 'exact', head: true })
      .gte('last_seen_at', since);

    if (error) {
      this.logger.error(`countOnlineWorkers() thất bại: ${error.message}`);
      throw new Error(`Không đếm được số Worker online: ${error.message}`);
    }
    return count ?? 0;
  }

  /** Đọc total_frames của internal job — cột này do chính Worker ghi
   * lại sau khi Scene Analyzer chạy xong (KHÔNG phải Backend ghi). */
  async getTotalFrames(internalJobId: string): Promise<number | null> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('jobs')
      .select('total_frames')
      .eq('id', internalJobId)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `getTotalFrames(${internalJobId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không đọc được total_frames: ${error.message}`);
    }
    return (
      (data as { total_frames: number | null } | null)?.total_frames ?? null
    );
  }

  /** Metadata do chính Worker ghi lại (Scene Analyzer) — dùng để quyết
   * định framerate thật khi ghép video kết quả (PackagingService/
   * VideoAssemblyService) — KHÔNG đoán fps, đọc từ Worker, mặc định 24
   * nếu Worker chưa ghi (giữ hành vi cũ trước khi có cột này). */
  async getJobMeta(
    internalJobId: string,
  ): Promise<{ totalFrames: number | null; fps: number }> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('jobs')
      .select('total_frames, fps')
      .eq('id', internalJobId)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `getJobMeta(${internalJobId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không đọc được metadata job: ${error.message}`);
    }
    const row = data as {
      total_frames: number | null;
      fps: number | null;
    } | null;
    return { totalFrames: row?.total_frames ?? null, fps: row?.fps ?? 24 };
  }

  /** Chi tiết claim/heartbeat từng task theo Worker — dùng để tính giá
   * THẬT theo runtime Worker thật (PricingService), KHÔNG dùng để điều
   * khiển logic dispatch (đó vẫn là việc của claim_task() nội bộ
   * Worker, không đổi ở đây). */
  async getTaskExecutionDetails(
    internalJobId: string,
  ): Promise<
    { workerId: string; claimedAt: string; lastHeartbeat: string | null }[]
  > {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('tasks')
      .select('worker_id, claimed_at, last_heartbeat')
      .eq('job_id', internalJobId)
      .not('worker_id', 'is', null)
      .not('claimed_at', 'is', null);

    if (error) {
      this.logger.error(
        `getTaskExecutionDetails(${internalJobId}) thất bại: ${error.message}`,
      );
      throw new Error(
        `Không đọc được chi tiết thực thi task: ${error.message}`,
      );
    }

    return (data ?? []).map((r) => ({
      workerId: (r as { worker_id: string }).worker_id,
      claimedAt: (r as { claimed_at: string }).claimed_at,
      lastHeartbeat: (r as { last_heartbeat: string | null }).last_heartbeat,
    }));
  }

  /** Chi tiết từng task của 1 internal job — Scheduler dùng để biết
   * probe task (frame 1-1) đã xong chưa, và max frame_end hiện có
   * (tránh tạo trùng task nếu tick chạy nhiều lần). */
  async getTasks(internalJobId: string): Promise<
    {
      frameStart: number;
      frameEnd: number;
      status: string;
      lastLog: string | null;
      workerId: string | null;
    }[]
  > {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('tasks')
      .select('frame_start, frame_end, status, last_log, worker_id')
      .eq('job_id', internalJobId);

    if (error) {
      this.logger.error(
        `getTasks(${internalJobId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không đọc được danh sách task: ${error.message}`);
    }
    return (data ?? []).map((r) => ({
      frameStart: (r as { frame_start: number }).frame_start,
      frameEnd: (r as { frame_end: number }).frame_end,
      status: (r as { status: string }).status,
      lastLog: (r as { last_log: string | null }).last_log,
      workerId: (r as { worker_id: string | null }).worker_id,
    }));
  }

  /**
   * Tạo các task còn lại (frame [from, totalFrames]) sau khi probe task
   * đã cho biết total_frames — chia theo chunkSize để nhiều Worker có
   * thể xử lý song song, thay vì 1 task khổng lồ hoặc 1 task/frame.
   * Đây tự động hoá đúng việc Dy từng làm tay cho CWS-JOB5 (chèn thêm
   * task qua SQL sau khi biết tổng frame thật).
   */
  async createRemainingTasks(
    internalJobId: string,
    fromFrame: number,
    totalFrames: number,
    chunkSize = 10,
  ): Promise<void> {
    if (fromFrame > totalFrames) return;

    const client = this.supabaseService.getClient();
    const rows: {
      job_id: string;
      frame_start: number;
      frame_end: number;
      status: string;
    }[] = [];

    for (let start = fromFrame; start <= totalFrames; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalFrames);
      rows.push({
        job_id: internalJobId,
        frame_start: start,
        frame_end: end,
        status: 'queued',
      });
    }

    if (rows.length === 0) return;

    const { error } = await client.from('tasks').insert(rows);
    if (error) {
      this.logger.error(
        `createRemainingTasks(${internalJobId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không tạo được các task còn lại: ${error.message}`);
    }
  }

  /** Danh sách sự cố Worker Fleet (Phase 6 CWS_WORKER_ROADMAP.md) — CHỈ
   * đọc từ `worker_incidents` (migration `worker_migrations/004_...`),
   * bảng này được ghi qua RPC `report_worker_incident()` — hiện tại chỉ
   * WORKER_CRASH được tự động ghi (mở rộng từ `report_worker_crash()` có
   * sẵn, không cần sửa cws_worker_full.py) và MERGE_FAIL (Worker gọi
   * trực tiếp khi `attempt_job_video_merge()` lỗi, xem `report_incident()`
   * trong cws_worker_full.py). Các loại lỗi khác trong "Lỗi tối thiểu"
   * của roadmap (GPU/CPU quá nhiệt, disk full...) CHƯA có code phát hiện
   * — không có dữ liệu để hiển thị, không tự bịa logic phát hiện mới.
   *
   * KHÔNG có hành động retry/requeue/quarantine/drain ở round này (đó là
   * thay đổi lên chính luồng dispatch Worker Fleet — rủi ro cao hơn hẳn
   * 1 bảng chỉ-đọc, để lại cho vòng sau khi Phase 2/3/4 đã được xác nhận
   * trên máy thật). */
  async listIncidents(filters?: {
    workerId?: string;
    severity?: string;
    resolved?: boolean;
    limit?: number;
  }): Promise<
    {
      id: number;
      workerId: string | null;
      taskId: number | null;
      eventType: string;
      severity: string;
      errorCode: string | null;
      summary: string;
      firstSeenAt: number;
      lastSeenAt: number;
      occurrenceCount: number;
      resolvedAt: number | null;
      resolution: string | null;
    }[]
  > {
    const client = this.supabaseService.getClient();
    let query = client
      .from('worker_incidents')
      .select(
        'id, worker_id, task_id, event_type, severity, error_code, summary, first_seen_at, last_seen_at, occurrence_count, resolved_at, resolution',
      )
      .order('last_seen_at', { ascending: false })
      .limit(filters?.limit ?? 200);

    if (filters?.workerId) query = query.eq('worker_id', filters.workerId);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.resolved === true)
      query = query.not('resolved_at', 'is', null);
    if (filters?.resolved === false) query = query.is('resolved_at', null);

    const { data, error } = await query;
    if (error) {
      this.logger.error(`listIncidents() thất bại: ${error.message}`);
      throw new Error(`Không đọc được danh sách sự cố: ${error.message}`);
    }

    return (data ?? []).map((r) => {
      const row = r as {
        id: number;
        worker_id: string | null;
        task_id: number | null;
        event_type: string;
        severity: string;
        error_code: string | null;
        summary: string;
        first_seen_at: string;
        last_seen_at: string;
        occurrence_count: number;
        resolved_at: string | null;
        resolution: string | null;
      };
      return {
        id: row.id,
        workerId: row.worker_id,
        taskId: row.task_id,
        eventType: row.event_type,
        severity: row.severity,
        errorCode: row.error_code,
        summary: row.summary,
        firstSeenAt: new Date(row.first_seen_at).getTime(),
        lastSeenAt: new Date(row.last_seen_at).getTime(),
        occurrenceCount: row.occurrence_count,
        resolvedAt: row.resolved_at
          ? new Date(row.resolved_at).getTime()
          : null,
        resolution: row.resolution,
      };
    });
  }

  /** Thống kê thời gian/tiền thuê host (Phase 8 CWS_WORKER_ROADMAP.md) —
   * CHỈ đọc từ `host_usage_sessions` (migration `worker_migrations/006_...`),
   * bảng này được TÍNH bởi RPC `compute_host_usage_sessions()` (cron 5
   * phút/lần, KHÔNG BAO GIỜ được Worker gọi trực tiếp — đúng nguyên tắc
   * "Worker không được tự quyết định billing"). `estimatedAmount`/
   * `hourlyRate` là `null` khi `fleets.hourly_rate` chưa được cấu hình
   * (status `awaiting_rate`) — KHÔNG hiện `0` để tránh hiểu lầm là miễn
   * phí. `finalAmount` hiện luôn `null` (xác nhận cuối là hành động Admin
   * riêng, chưa làm ở vòng này). */
  async listHostUsageSessions(limit = 200): Promise<
    {
      id: number;
      workerId: string | null;
      taskId: number | null;
      startupSeconds: number;
      startupGraceSeconds: number;
      waitingSeconds: number;
      renderSeconds: number;
      mergeSeconds: number;
      uploadSeconds: number;
      verificationSeconds: number;
      billableSeconds: number;
      nonBillableSeconds: number;
      hourlyRate: number | null;
      estimatedAmount: number | null;
      finalAmount: number | null;
      status: string;
      createdAt: number;
    }[]
  > {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('host_usage_sessions')
      .select(
        'id, worker_id, task_id, startup_seconds, startup_grace_seconds, waiting_seconds, render_seconds, merge_seconds, upload_seconds, verification_seconds, billable_seconds, non_billable_seconds, hourly_rate, estimated_amount, final_amount, status, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error(`listHostUsageSessions() thất bại: ${error.message}`);
      throw new Error(`Không đọc được thống kê host: ${error.message}`);
    }

    return (data ?? []).map((r) => {
      const row = r as {
        id: number;
        worker_id: string | null;
        task_id: number | null;
        startup_seconds: number;
        startup_grace_seconds: number;
        waiting_seconds: number;
        render_seconds: number;
        merge_seconds: number;
        upload_seconds: number;
        verification_seconds: number;
        billable_seconds: number;
        non_billable_seconds: number;
        hourly_rate: number | null;
        estimated_amount: number | null;
        final_amount: number | null;
        status: string;
        created_at: string;
      };
      return {
        id: row.id,
        workerId: row.worker_id,
        taskId: row.task_id,
        startupSeconds: row.startup_seconds,
        startupGraceSeconds: row.startup_grace_seconds,
        waitingSeconds: row.waiting_seconds,
        renderSeconds: row.render_seconds,
        mergeSeconds: row.merge_seconds,
        uploadSeconds: row.upload_seconds,
        verificationSeconds: row.verification_seconds,
        billableSeconds: row.billable_seconds,
        nonBillableSeconds: row.non_billable_seconds,
        hourlyRate: row.hourly_rate,
        estimatedAmount: row.estimated_amount,
        finalAmount: row.final_amount,
        status: row.status,
        createdAt: new Date(row.created_at).getTime(),
      };
    });
  }

  /** Hành động Admin (ngoài `CWS_WORKER_ROADMAP.md`, roadmap đã hết ở
   * Phase 8) — đóng lỗ hổng còn thiếu rõ nhất của Phase 6 ("Admin
   * dashboard cần: retry/requeue/quarantine/drain, audit log"). Cả 4 RPC
   * đều CHỈ ở Postgres (migration `worker_migrations/008_...`), KHÔNG
   * đụng Python — "quarantine"/"drain" được THỰC THI thật qua `claim_task()`
   * (worker bị quarantine/drain sẽ không claim được task mới nữa),
   * KHÔNG chỉ là nhãn hiển thị. Audit log tái dùng `worker_incidents`
   * (Phase 6, event_type tiền tố `ADMIN_*`) thay vì bảng riêng. */
  async adminRetryTask(taskId: number): Promise<boolean> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.rpc('admin_retry_task', {
      p_task_id: taskId,
    });
    if (error) {
      this.logger.error(`adminRetryTask(${taskId}) thất bại: ${error.message}`);
      throw new Error(`Không retry được task: ${error.message}`);
    }
    return data === true;
  }

  async adminRequeueTask(taskId: number): Promise<boolean> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.rpc('admin_requeue_task', {
      p_task_id: taskId,
    });
    if (error) {
      this.logger.error(
        `adminRequeueTask(${taskId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không requeue được task: ${error.message}`);
    }
    return data === true;
  }

  async adminSetWorkerQuarantine(
    workerId: string,
    quarantined: boolean,
    reason?: string,
  ): Promise<boolean> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.rpc('admin_set_worker_quarantine', {
      p_worker_id: workerId,
      p_quarantined: quarantined,
      p_reason: reason ?? null,
    });
    if (error) {
      this.logger.error(
        `adminSetWorkerQuarantine(${workerId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không đổi được trạng thái quarantine: ${error.message}`);
    }
    return data === true;
  }

  async adminSetWorkerDrain(
    workerId: string,
    draining: boolean,
    reason?: string,
  ): Promise<boolean> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.rpc('admin_set_worker_drain', {
      p_worker_id: workerId,
      p_draining: draining,
      p_reason: reason ?? null,
    });
    if (error) {
      this.logger.error(
        `adminSetWorkerDrain(${workerId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không đổi được trạng thái drain: ${error.message}`);
    }
    return data === true;
  }
}
