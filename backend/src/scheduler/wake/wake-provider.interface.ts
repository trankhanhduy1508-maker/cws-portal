export const WAKE_PROVIDER = Symbol('WAKE_PROVIDER');

export interface WakeResult {
  attempted: boolean;
  success: boolean;
  reason?: string;
}

/**
 * Interface cho việc "đánh thức" 1 Worker đang Sleep/Hibernate.
 * Implementation thật (gửi Magic Packet qua 1 Worker khác đang online
 * cùng site — xem nghiên cứu Wake Architecture) CẦN sửa nhẹ
 * cws_worker_full.py để thêm hàm relay_wake_command(), đây là thay
 * đổi Foundation cần Dy xác nhận riêng, CHƯA làm trong đợt này.
 */
export interface IWakeProvider {
  wake(workerId: string, siteId: string): Promise<WakeResult>;
}
