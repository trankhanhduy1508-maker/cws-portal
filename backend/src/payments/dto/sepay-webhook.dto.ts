import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Payload SePay gửi tới POST /payments/webhook/sepay khi có biến động số
 * dư MB Bank thật (nghiên cứu 2026-08-01, https://developer.sepay.vn) —
 * field name giữ NGUYÊN theo đúng payload thật của SePay, không đổi tên
 * để khớp style CWS (khác MbbankNotificationDto — đó là app Android CWS
 * tự đóng gói, còn đây là bên thứ ba, đổi tên chỉ gây khó đối chiếu khi
 * debug/log).
 *
 * `transferType` PHẢI là 'in' mới xử lý — SePay có thể gửi cả giao dịch
 * 'out' nếu Owner cấu hình Event type = "Both" lúc tạo Webhook trên
 * SePay Dashboard (mặc định nên chọn "Money in" để không cần lọc, nhưng
 * validate lại ở đây cho chắc, không tin tưởng mù quáng cấu hình phía
 * SePay — xem PaymentsService.confirmViaSepayWebhook()).
 */
export class SepayWebhookDto {
  /** ID giao dịch của SePay — khoá chống trùng/replay DUY NHẤT, lưu vào
   * payment_notifications.transaction_id (migration 014, UNIQUE constraint). */
  @IsNumber()
  id!: number;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsOptional()
  @IsString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  code?: string | null;

  /** Nội dung chuyển khoản thật — chứa "CWS {storage_code} {payment_code}"
   * nếu khách chuyển đúng nội dung QR, xem PaymentsService.matchAndConfirm(). */
  @IsString()
  content!: string;

  @IsIn(['in', 'out'])
  transferType!: 'in' | 'out';

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  transferAmount!: number;

  @IsOptional()
  @IsString()
  referenceCode?: string;
}
