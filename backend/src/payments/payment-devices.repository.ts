import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DeviceHeartbeatDto } from './dto/device-heartbeat.dto';

const TABLE = 'payment_devices';

export interface PaymentDeviceRow {
  deviceId: string;
  label: string | null;
  isActive: boolean;
  manufacturer: string | null;
  model: string | null;
  androidVersion: string | null;
  appVersion: string | null;
  notificationListenerEnabled: boolean | null;
  batteryOptimizationIgnored: boolean | null;
  lastHeartbeatAt: number | null;
  lastNotificationAt: number | null;
  lastError: string | null;
  createdAt: number;
}

function rowToDomain(row: Record<string, unknown>): PaymentDeviceRow {
  return {
    deviceId: row.device_id as string,
    label: (row.label as string | null) ?? null,
    isActive: row.is_active as boolean,
    manufacturer: (row.manufacturer as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    androidVersion: (row.android_version as string | null) ?? null,
    appVersion: (row.app_version as string | null) ?? null,
    notificationListenerEnabled: (row.notification_listener_enabled as boolean | null) ?? null,
    batteryOptimizationIgnored: (row.battery_optimization_ignored as boolean | null) ?? null,
    lastHeartbeatAt: row.last_heartbeat_at ? new Date(row.last_heartbeat_at as string).getTime() : null,
    lastNotificationAt: row.last_notification_at
      ? new Date(row.last_notification_at as string).getTime()
      : null,
    lastError: (row.last_error as string | null) ?? null,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

/** Đọc/ghi bảng payment_devices (migration 015) — tách riêng khỏi
 * PaymentsRepository (payments/payment_notifications) vì khác domain:
 * đây là quản lý THIẾT BỊ gửi notification, không phải bản thân giao dịch. */
@Injectable()
export class PaymentDevicesRepository {
  private readonly logger = new Logger(PaymentDevicesRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async updateHeartbeat(deviceId: string, dto: DeviceHeartbeatDto): Promise<void> {
    const update: Record<string, unknown> = { last_heartbeat_at: new Date().toISOString() };
    if (dto.manufacturer !== undefined) update.manufacturer = dto.manufacturer;
    if (dto.model !== undefined) update.model = dto.model;
    if (dto.android_version !== undefined) update.android_version = dto.android_version;
    if (dto.app_version !== undefined) update.app_version = dto.app_version;
    if (dto.notification_listener_enabled !== undefined) {
      update.notification_listener_enabled = dto.notification_listener_enabled;
    }
    if (dto.battery_optimization_ignored !== undefined) {
      update.battery_optimization_ignored = dto.battery_optimization_ignored;
    }
    if (dto.last_error !== undefined) update.last_error = dto.last_error;

    const { error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update(update)
      .eq('device_id', deviceId);

    if (error) {
      this.logger.error(`updateHeartbeat(${deviceId}) thất bại: ${error.message}`);
      throw new Error(`Không cập nhật được heartbeat: ${error.message}`);
    }
  }

  /** Gọi sau MỌI notification (hợp lệ hay bị từ chối) — "lần cuối nhận
   * thông báo MBBank" phải phản ánh THIẾT BỊ có còn hoạt động không, không
   * chỉ phản ánh giao dịch hợp lệ gần nhất. */
  async touchNotification(deviceId: string, error: string | null): Promise<void> {
    const update: Record<string, unknown> = { last_notification_at: new Date().toISOString() };
    if (error !== null) update.last_error = error;

    const { error: dbError } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update(update)
      .eq('device_id', deviceId);

    if (dbError) {
      this.logger.error(`touchNotification(${deviceId}) thất bại: ${dbError.message}`);
      // Không throw — đây là cập nhật phụ (audit), không được làm hỏng kết
      // quả chính (PAID/rejected) của confirmViaMbbankNotification().
    }
  }

  /** Admin Dashboard (Phần 2.5 yêu cầu) — CHỈ đọc. */
  async listAll(): Promise<PaymentDeviceRow[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .order('last_heartbeat_at', { ascending: false, nullsFirst: false });

    if (error) {
      this.logger.error(`listAll() thất bại: ${error.message}`);
      throw new Error(`Không đọc được danh sách thiết bị: ${error.message}`);
    }
    return (data ?? []).map(rowToDomain);
  }
}
