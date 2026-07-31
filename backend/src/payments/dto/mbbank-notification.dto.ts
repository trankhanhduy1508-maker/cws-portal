import { IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

/**
 * Payload app Android Notification Listener gửi về sau khi đọc được
 * thông báo biến động số dư MBBank thật trên điện thoại — field name
 * giữ nguyên snake_case đúng như thiết kế API (không phải payload ngân
 * hàng chính thức, do chính app Android này tự đóng gói lại từ
 * StatusBarNotification.getNotification().extras).
 */
export class MbbankNotificationDto {
  /** ID giao dịch NGÂN HÀNG (đọc được từ nội dung thông báo, KHÔNG phải
   * ID tự sinh của điện thoại) — khoá chống trùng/replay DUY NHẤT
   * (migration 014: UNIQUE constraint), xem PaymentsService.confirmViaMbbankNotification(). */
  @IsString()
  transaction_id!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  transaction_time?: string;

  @IsOptional()
  @IsString()
  sender_name?: string;

  @IsOptional()
  @IsString()
  sender_account?: string;

  @IsString()
  transfer_content!: string;

  @IsOptional()
  @IsNumber()
  balance_after?: number;

  /** Toàn bộ payload thô (title/text/bigText/extras...) — lưu nguyên vẹn
   * vào payment_notifications.raw_notification để điều tra sau này nếu
   * cần, KHÔNG dùng để quyết định thanh toán (chỉ 2 trường transfer_content
   * + amount mới quyết định, xem PaymentsService). */
  @IsOptional()
  @IsObject()
  raw_notification?: Record<string, unknown>;
}
