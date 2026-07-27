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
      throw new Error(`Không tạo được job cho Worker Fleet: ${jobError.message}`);
    }

    const { error: taskError } = await client.from('tasks').insert({
      job_id: params.internalJobId,
      frame_start: 1,
      frame_end: 1,
      status: 'queued',
    });

    if (taskError) {
      this.logger.error(`Tạo probe task thất bại: ${taskError.message}`);
      throw new Error(`Không tạo được task cho Worker Fleet: ${taskError.message}`);
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
      this.logger.error(`getTaskSummary(${internalJobId}) thất bại: ${error.message}`);
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

  /** Số lượng Worker đang online (last_seen_at gần đây) — dùng cho
   * Scheduler Model 1 (đủ máy Online thì không cần Wake). */
  async countOnlineWorkers(withinSeconds = 30): Promise<number> {
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
      this.logger.error(`getTotalFrames(${internalJobId}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được total_frames: ${error.message}`);
    }
    return (data as { total_frames: number | null } | null)?.total_frames ?? null;
  }

  /** Chi tiết từng task của 1 internal job — Scheduler dùng để biết
   * probe task (frame 1-1) đã xong chưa, và max frame_end hiện có
   * (tránh tạo trùng task nếu tick chạy nhiều lần). */
  async getTasks(
    internalJobId: string,
  ): Promise<{ frameStart: number; frameEnd: number; status: string }[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('tasks')
      .select('frame_start, frame_end, status')
      .eq('job_id', internalJobId);

    if (error) {
      this.logger.error(`getTasks(${internalJobId}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được danh sách task: ${error.message}`);
    }
    return (data ?? []).map((r) => ({
      frameStart: (r as { frame_start: number }).frame_start,
      frameEnd: (r as { frame_end: number }).frame_end,
      status: (r as { status: string }).status,
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
    const rows: { job_id: string; frame_start: number; frame_end: number; status: string }[] = [];

    for (let start = fromFrame; start <= totalFrames; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalFrames);
      rows.push({ job_id: internalJobId, frame_start: start, frame_end: end, status: 'queued' });
    }

    if (rows.length === 0) return;

    const { error } = await client.from('tasks').insert(rows);
    if (error) {
      this.logger.error(`createRemainingTasks(${internalJobId}) thất bại: ${error.message}`);
      throw new Error(`Không tạo được các task còn lại: ${error.message}`);
    }
  }
}
