import { IsNumber, IsString, Min } from 'class-validator';

/**
 * Payload webhook ngân hàng báo về sau khi khách chuyển khoản thành
 * công. Hình dạng CHUNG (transferContent + amountVnd) — khi nối cổng
 * MB Bank thật, đổi field name cho khớp payload thật của họ ngay tại
 * đây, không cần sửa PaymentsService.confirmViaWebhook().
 */
export class WebhookPaymentDto {
  @IsString()
  transferContent!: string;

  @IsNumber()
  @Min(1)
  amountVnd!: number;
}
