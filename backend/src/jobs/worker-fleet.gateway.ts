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
   * bảng `workers` (đúng nguyên tắc "không đụng Worker Fleet"). */
  async listWorkers(): Promise<
    {
      workerId: string;
      gpuName: string | null;
      vramMb: number | null;
      status: string;
      lastSeenAt: number;
      crashCount: number;
    }[]
  > {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('workers')
      .select('worker_id, gpu_name, vram_mb, status, last_seen_at, crash_count')
      .order('last_seen_at', { ascending: false });

    if (error) {
      this.logger.error(`listWorkers() thất bại: ${error.message}`);
      throw new Error(`Không đọc được danh sách Worker: ${error.message}`);
    }
    return (data ?? []).map((r) => ({
      workerId: (r as { worker_id: string }).worker_id,
      gpuName: (r as { gpu_name: string | null }).gpu_name,
      vramMb: (r as { vram_mb: number | null }).vram_mb,
      status: (r as { status: string }).status,
      lastSeenAt: new Date(
        (r as { last_seen_at: string }).last_seen_at,
      ).getTime(),
      crashCount: (r as { crash_count: number }).crash_count,
    }));
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
}
