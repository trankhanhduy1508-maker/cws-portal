import { IsBoolean, IsOptional, IsString } from 'class-validator';

/** Heartbeat định kỳ từ app Android (PHẦN 2.5) — CHỈ metadata thiết bị/
 * trạng thái app, KHÔNG có ý nghĩa tài chính (khác MbbankNotificationDto).
 * Mọi field optional — app gửi được gì thì gửi, Backend không chặn heartbeat
 * thiếu field (khác với notification thanh toán, phải đủ field mới xử lý). */
export class DeviceHeartbeatDto {
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  android_version?: string;

  @IsOptional()
  @IsString()
  app_version?: string;

  @IsOptional()
  @IsBoolean()
  notification_listener_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  battery_optimization_ignored?: boolean;

  /** Lỗi gần nhất app tự ghi nhận (vd gửi notification thất bại nhiều lần
   * liên tiếp) — hiển thị ở Admin Dashboard, KHÔNG dùng để quyết định gì. */
  @IsOptional()
  @IsString()
  last_error?: string;
}
