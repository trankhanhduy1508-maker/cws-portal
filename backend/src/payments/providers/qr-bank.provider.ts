import { Injectable, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IPaymentProvider } from './payment-provider.interface';
import { PaymentStatus } from '../payment.types';

/**
 * GIỚI HẠN THẬT (ghi rõ, không giả vờ): chưa nối cổng QR ngân hàng
 * thật (chưa có số tài khoản MB Bank thật để dựng VietQR — cần chủ dự
 * án cung cấp). createIntent() sinh payment_code + transfer_content
 * đúng định dạng CWS_MVP_WORKFLOW_FINAL.md ("CWS {payment_code}"), đủ
 * để PaymentsController.webhook() xác nhận khi ngân hàng báo về thật.
 * confirm() KHÔNG tự set PAID nữa — xác nhận CHỈ đến từ webhook (xem
 * PaymentsService.confirmViaWebhook), đúng nguyên tắc "Frontend không
 * được tự đặt Payment = PAID".
 */
@Injectable()
export class QrBankProvider implements IPaymentProvider {
  async createIntent(
    _amountVnd: number,
  ): Promise<{
    providerRef: string;
    status: PaymentStatus;
    paymentCode: string | null;
    transferContent: string | null;
  }> {
    const paymentCode = randomBytes(4).toString('hex').toUpperCase();
    return {
      providerRef: `qr-${paymentCode}`,
      status: PaymentStatus.PROCESSING,
      paymentCode,
      transferContent: `CWS ${paymentCode}`,
    };
  }

  async confirm(_providerRef: string): Promise<{ status: PaymentStatus }> {
    throw new BadRequestException(
      'qr_bank không hỗ trợ xác nhận trực tiếp — chờ webhook ngân hàng xác nhận qua POST /payments/webhook',
    );
  }
}
