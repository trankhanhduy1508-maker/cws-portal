import { Injectable, Logger } from '@nestjs/common';
import { IWakeProvider, WakeResult } from './wake-provider.interface';

/**
 * GIỚI HẠN THẬT (ghi rõ, không giả vờ): Backend hiện CHƯA thể gửi Magic
 * Packet thật, vì việc đó cần 1 Worker đang online cùng site chủ động
 * phát broadcast L2 nội bộ — cws_worker_full.py CHƯA có hàm này
 * (relay_wake_command). Theo đúng nguyên tắc "không sửa Worker trừ khi
 * thật sự bắt buộc", đợt triển khai này CHỈ dừng ở việc Scheduler biết
 * "cần Wake nhưng không làm được" rồi rơi đúng vào nhánh Model 2
 * ("Nếu Wake thất bại → đưa Job vào Queue") — không đứng yên chờ vô
 * hạn, không giả vờ đã Wake thành công.
 *
 * Khi Dy đồng ý mở rộng Worker (bước riêng, cần xác nhận theo Foundation
 * First), thay thế class này bằng implementation thật, giữ nguyên
 * interface IWakeProvider.
 */
@Injectable()
export class NoopWakeProvider implements IWakeProvider {
  private readonly logger = new Logger(NoopWakeProvider.name);

  async wake(workerId: string, siteId: string): Promise<WakeResult> {
    this.logger.warn(
      `Yêu cầu Wake worker=${workerId} site=${siteId} nhưng CHƯA có cơ chế Wake thật ` +
        `(cws_worker_full.py chưa có relay_wake_command). Trả về thất bại — job sẽ vào Queue.`,
    );
    return {
      attempted: true,
      success: false,
      reason: 'Wake provider chưa triển khai thật — cần mở rộng Worker (Foundation change, cần Dy xác nhận riêng)',
    };
  }
}
