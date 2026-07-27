import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { IWakeProvider, WAKE_PROVIDER, WakeResult } from './wake-provider.interface';

interface WakeCandidateRow {
  worker_id: string;
  site_id: string;
}

@Injectable()
export class WakeService {
  private readonly logger = new Logger(WakeService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(WAKE_PROVIDER) private readonly wakeProvider: IWakeProvider,
  ) {}

  /**
   * Model 2: tìm 1 máy Sleep/Hibernate có khai báo Wake Capability,
   * thuộc site có wake_policy = 'wake_enabled', VÀ có ít nhất 1 Worker
   * khác đang online cùng site để làm relay (điều kiện đã xác định
   * trong nghiên cứu Wake Architecture — WoL không tự vượt qua Internet
   * được nếu không có máy nào online cùng LAN để relay).
   */
  async tryWakeAnyCandidate(): Promise<WakeResult> {
    const candidates = await this.findWakeCandidates();
    if (candidates.length === 0) {
      return { attempted: false, success: false, reason: 'Không có máy nào đủ điều kiện Wake' };
    }

    for (const candidate of candidates) {
      const result = await this.wakeProvider.wake(candidate.worker_id, candidate.site_id);
      if (result.success) return result;
    }

    return {
      attempted: true,
      success: false,
      reason: 'Đã thử toàn bộ máy khả dụng nhưng Wake thất bại',
    };
  }

  private async findWakeCandidates(): Promise<WakeCandidateRow[]> {
    const client = this.supabaseService.getClient();

    // Điều kiện: site cho phép Wake, máy hỗ trợ WoL, VÀ có Worker khác
    // đang online (last_seen_at gần đây) cùng site_id để làm relay.
    const { data, error } = await client.rpc('find_wake_candidates');

    if (error) {
      // RPC này CHƯA tồn tại cho tới khi Dy chạy migration 003 — trả
      // về rỗng thay vì crash toàn bộ Scheduler tick.
      this.logger.warn(`find_wake_candidates() chưa sẵn sàng: ${error.message}`);
      return [];
    }
    return (data ?? []) as WakeCandidateRow[];
  }
}
