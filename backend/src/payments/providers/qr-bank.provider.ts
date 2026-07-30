import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { IPaymentProvider } from './payment-provider.interface';
import { PaymentStatus } from '../payment.types';
import { AppConfig } from '../../config/configuration';

/** BIN NAPAS của MB Bank (Military Commercial Joint Stock Bank) — thông
 * tin công khai của ngành ngân hàng, không phải secret. Dùng để dựng
 * VietQR qua dịch vụ ảnh công khai img.vietqr.io (không cần API key). */
const MB_BANK_BIN = '970422';
const MB_BANK_NAME = 'MB Bank';

/**
 * GIỚI HẠN THẬT (ghi rõ, không giả vờ): chưa có số tài khoản MB Bank
 * thật (cần chủ dự án cung cấp qua MB_BANK_ACCOUNT_NUMBER/NAME) — khi
 * thiếu, qrImageUrl trả null (không bịa ảnh QR trỏ tới tài khoản không
 * có thật), Portal chỉ hiển thị nội dung chuyển khoản dạng text.
 * createIntent() sinh payment_code + transfer_content đúng định dạng
 * CWS_MVP_WORKFLOW_FINAL.md ("CWS {payment_code}"), đủ để
 * PaymentsController.webhook() xác nhận khi ngân hàng báo về thật.
 * confirm() KHÔNG tự set PAID nữa — xác nhận CHỈ đến từ webhook (xem
 * PaymentsService.confirmViaWebhook), đúng nguyên tắc "Frontend không
 * được tự đặt Payment = PAID".
 */
@Injectable()
export class QrBankProvider implements IPaymentProvider {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async createIntent(
    amountVnd: number,
    storageCode?: string | null,
  ): Promise<{
    providerRef: string;
    status: PaymentStatus;
    paymentCode: string | null;
    transferContent: string | null;
    qrImageUrl: string | null;
    bankName: string | null;
    accountNumber: string | null;
  }> {
    const paymentCode = randomBytes(4).toString('hex').toUpperCase();
    const transferContent = storageCode ? `CWS ${storageCode} ${paymentCode}` : `CWS ${paymentCode}`;
    const { accountNumber, accountName } = this.configService.get('mbBank', { infer: true });

    const qrImageUrl = accountNumber
      ? this.buildVietQrUrl(accountNumber, accountName, amountVnd, transferContent)
      : null;

    return {
      providerRef: `qr-${paymentCode}`,
      status: PaymentStatus.PROCESSING,
      paymentCode,
      transferContent,
      qrImageUrl,
      bankName: accountNumber ? MB_BANK_NAME : null,
      accountNumber: accountNumber || null,
    };
  }

  async confirm(_providerRef: string): Promise<{ status: PaymentStatus }> {
    throw new BadRequestException(
      'qr_bank không hỗ trợ xác nhận trực tiếp — chờ webhook ngân hàng xác nhận qua POST /payments/webhook',
    );
  }

  /** Dùng dịch vụ ảnh QR công khai của VietQR.io (không cần đăng ký/API
   * key riêng) — xem https://www.vietqr.io/danh-sach-api. */
  private buildVietQrUrl(
    accountNumber: string,
    accountName: string | null,
    amountVnd: number,
    transferContent: string,
  ): string {
    const params = new URLSearchParams({
      amount: String(Math.round(amountVnd)),
      addInfo: transferContent,
    });
    if (accountName) params.set('accountName', accountName);
    return `https://img.vietqr.io/image/${MB_BANK_BIN}-${accountNumber}-compact2.png?${params.toString()}`;
  }
}
