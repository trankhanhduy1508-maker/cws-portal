import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentsRepository } from './payments.repository';
import { PaymentDevicesRepository } from './payment-devices.repository';
import { QrBankProvider } from './providers/qr-bank.provider';
import { IPaymentProvider } from './providers/payment-provider.interface';
import { PaymentMethod, PaymentRecord, PaymentStatus } from './payment.types';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';
import { MbbankNotificationDto } from './dto/mbbank-notification.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { AffiliateService } from '../affiliates/affiliate.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Partial<Record<PaymentMethod, IPaymentProvider>>;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentDevicesRepository: PaymentDevicesRepository,
    qrBankProvider: QrBankProvider,
    @Optional() private readonly affiliateService: AffiliateService,
  ) {
    // MVP chá»‰ dÃ¹ng MB Bank QR (CWS_ROADMAP_MVP_V1.md, Giai Ä‘oáº¡n 5).
    // Wallet/Stripe/PayPal khÃ´ng thuá»™c MVP â€” Ä‘Ã£ gá»¡ khá»i registry.
    this.providers = {
      [PaymentMethod.QR_BANK]: qrBankProvider,
    };
  }

  /**
   * `jobContext` gáº¯n payment vá»›i 1 job cá»¥ thá»ƒ (JobsService.approve() â€”
   * CWS_MVP_WORKFLOW_FINAL.md: QR chá»‰ sinh SAU khi khÃ¡ch duyá»‡t preview)
   * Ä‘á»ƒ transferContent chá»©a storage_code vÃ  webhook Ä‘á»‘i chiáº¿u Ä‘Æ°á»£c cáº£
   * 2 mÃ£. KhÃ´ng báº¯t buá»™c â€” POST /payments gá»i trá»±c tiáº¿p (khÃ´ng qua job)
   * váº«n hoáº¡t Ä‘á»™ng, chá»‰ khÃ´ng cÃ³ storage_code trong ná»™i dung chuyá»ƒn khoáº£n.
   */
  async createIntent(
    dto: CreatePaymentDto,
    jobContext?: { jobId: string; storageCode: string },
  ): Promise<{
    paymentId: string;
    status: PaymentStatus;
    paymentCode: string | null;
    transferContent: string | null;
    amountVnd: number;
    qrImageUrl: string | null;
  }> {
    const provider = this.providers[dto.method];
    if (!provider) {
      throw new BadRequestException(
        `PhÆ°Æ¡ng thá»©c thanh toÃ¡n "${dto.method}" chÆ°a Ä‘Æ°á»£c há»— trá»£ á»Ÿ Backend (chá»‰ qr_bank kháº£ dá»¥ng trong MVP)`,
      );
    }

    const { providerRef, status, paymentCode, transferContent, qrImageUrl, bankName, accountNumber } =
      await provider.createIntent(dto.amountVnd, jobContext?.storageCode ?? null);
    const paymentId = randomUUID();

    const record: PaymentRecord = {
      paymentId,
      amountVnd: dto.amountVnd,
      method: dto.method,
      status,
      createdAt: Date.now(),
      confirmedAt: null,
      paymentCode,
      transferContent,
      jobId: jobContext?.jobId ?? null,
      storageCode: jobContext?.storageCode ?? null,
      bankName,
      accountNumber,
      qrImageUrl,
    };
    await this.paymentsRepository.create(record);

    // LÆ°u providerRef vÃ o paymentId Ä‘á»ƒ confirm() sau tÃ¬m láº¡i Ä‘Ãºng provider â€”
    // Ä‘Æ¡n giáº£n hoÃ¡: dÃ¹ng chÃ­nh paymentId lÃ m khÃ³a tra cá»©u, providerRef giá»¯
    // ná»™i bá»™ provider (qr-*) Ä‘á»§ Ä‘á»ƒ suy luáº­n láº¡i provider nÃ o xá»­ lÃ½.
    void providerRef;
    return { paymentId, status, paymentCode, transferContent, amountVnd: dto.amountVnd, qrImageUrl };
  }

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    const record = await this.paymentsRepository.findById(paymentId);
    if (!record) throw new NotFoundException(`KhÃ´ng tÃ¬m tháº¥y payment ${paymentId}`);
    return record.status;
  }

  /** Chi tiáº¿t Ä‘áº§y Ä‘á»§ cho Portal hiá»ƒn thá»‹ láº¡i QR/ná»™i dung chuyá»ƒn khoáº£n
   * (vd khÃ¡ch táº£i láº¡i trang lÃºc Ä‘ang chá» thanh toÃ¡n) â€” khÃ´ng chá»‰ status. */
  async getPublicDetails(paymentId: string): Promise<{
    paymentId: string;
    status: PaymentStatus;
    paymentCode: string | null;
    transferContent: string | null;
    amountVnd: number;
    qrImageUrl: string | null;
  }> {
    const record = await this.paymentsRepository.findById(paymentId);
    if (!record) throw new NotFoundException(`KhÃ´ng tÃ¬m tháº¥y payment ${paymentId}`);
    return {
      paymentId: record.paymentId,
      status: record.status,
      paymentCode: record.paymentCode,
      transferContent: record.transferContent,
      amountVnd: record.amountVnd,
      qrImageUrl: record.qrImageUrl,
    };
  }

  /** Customer chá»‰ Ä‘Æ°á»£c xem payment gáº¯n vá»›i job cá»§a chÃ­nh mÃ¬nh. */
  async getPublicDetailsForCustomer(paymentId: string, customerId: string | null) {
    if (!customerId) throw new BadRequestException('Cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ xem payment');
    const record = await this.paymentsRepository.findByIdForCustomer(paymentId, customerId);
    if (!record) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y payment hoáº·c khÃ´ng cÃ³ quyá»n truy cáº­p');
    return {
      paymentId: record.paymentId,
      status: record.status,
      paymentCode: record.paymentCode,
      transferContent: record.transferContent,
      amountVnd: record.amountVnd,
      qrImageUrl: record.qrImageUrl,
    };
  }

  /** Admin tra cá»©u theo Payment Code (CWS_ROADMAP_MVP_V1.md, Giai Ä‘oáº¡n 7). */
  async getByPaymentCode(paymentCode: string): Promise<PaymentRecord> {
    const record = await this.paymentsRepository.findByPaymentCode(paymentCode.toUpperCase());
    if (!record) throw new NotFoundException(`KhÃ´ng tÃ¬m tháº¥y payment vá»›i mÃ£ ${paymentCode}`);
    return record;
  }

  /** Payment/refund safety net (2026-08-03) â€” xem PaymentsRepository.listReconciliationAnomalies(). */
  async listReconciliationAnomalies() {
    return this.paymentsRepository.listReconciliationAnomalies();
  }

  async confirm(paymentId: string): Promise<{ paymentId: string; status: PaymentStatus }> {
    const record = await this.paymentsRepository.findById(paymentId);
    if (!record) throw new NotFoundException(`KhÃ´ng tÃ¬m tháº¥y payment ${paymentId}`);

    const provider = this.providers[record.method];
    if (!provider) {
      throw new BadRequestException(`PhÆ°Æ¡ng thá»©c thanh toÃ¡n "${record.method}" chÆ°a Ä‘Æ°á»£c há»— trá»£`);
    }

    const { status } = await provider.confirm(paymentId);
    await this.paymentsRepository.updateStatus(paymentId, status);
    return { paymentId, status };
  }

  /**
   * Webhook ngÃ¢n hÃ ng bÃ¡o giao dá»‹ch thÃ nh cÃ´ng (CWS_MVP_WORKFLOW_FINAL.md,
   * má»¥c Webhook): kiá»ƒm tra sá»‘ tiá»n + ná»™i dung + payment_code + storage_code,
   * CHá»ˆ khi khá»›p má»›i set PAID. ÄÃ¢y lÃ  Ä‘Æ°á»ng DUY NHáº¤T há»£p lá»‡ Ä‘á»ƒ Ä‘áº·t PAID
   * cho qr_bank â€” khÃ´ng cÃ³ endpoint nÃ o khÃ¡c cho phÃ©p client tá»± Ä‘áº·t PAID.
   *
   * Äá»‹nh dáº¡ng báº¯t buá»™c: "CWS {storage_code} {payment_code}" â€” payment
   * nÃ o khÃ´ng gáº¯n job (jobContext rá»—ng lÃºc táº¡o, chá»‰ xáº£y ra khi gá»i tháº³ng
   * POST /payments khÃ´ng qua JobsService.approve()) sáº½ khÃ´ng cÃ³
   * storage_code Ä‘á»ƒ Ä‘á»‘i chiáº¿u, webhook cho payment Ä‘Ã³ luÃ´n bá»‹ tá»« chá»‘i
   * (khÃ´ng pháº£i luá»“ng tháº­t cá»§a MVP nÃªn cháº¥p nháº­n giá»›i háº¡n nÃ y).
   */
  async confirmViaWebhook(dto: WebhookPaymentDto): Promise<{ paymentId: string; status: PaymentStatus }> {
    return this.matchAndConfirm(dto.transferContent, dto.amountVnd);
  }

  /**
   * Logic Ä‘á»‘i chiáº¿u + Ä‘áº·t PAID DÃ™NG CHUNG cho má»i nguá»“n bÃ¡o thanh toÃ¡n
   * (webhook ngÃ¢n hÃ ng/cá»•ng trung gian THáº¬T, hoáº·c app Android Ä‘á»c thÃ´ng
   * bÃ¡o MBBank â€” xem confirmViaMbbankNotification()) â€” CHá»ˆ 1 nÆ¡i duy
   * nháº¥t Ä‘Æ°á»£c phÃ©p set PAID, trÃ¡nh 2 luá»“ng Ä‘á»‘i chiáº¿u lá»‡ch nhau.
   */
  private async matchAndConfirm(
    transferContent: string,
    amountVnd: number,
  ): Promise<{ paymentId: string; status: PaymentStatus }> {
    const match = transferContent.match(/CWS\s+(\S+)\s+([A-Za-z0-9]+)/);
    if (!match) {
      throw new BadRequestException(
        `Ná»™i dung chuyá»ƒn khoáº£n khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng "CWS {storage_code} {payment_code}": "${transferContent}"`,
      );
    }
    const [, storageCodeRaw, paymentCodeRaw] = match;
    const paymentCode = paymentCodeRaw.toUpperCase();
    const storageCode = storageCodeRaw.toUpperCase();

    const record = await this.paymentsRepository.findByPaymentCode(paymentCode);
    if (!record) {
      throw new NotFoundException(`KhÃ´ng tÃ¬m tháº¥y payment vá»›i mÃ£ ${paymentCode}`);
    }
    if (record.status === PaymentStatus.PAID) {
      return { paymentId: record.paymentId, status: record.status }; // Ä‘Ã£ xá»­ lÃ½ trÆ°á»›c Ä‘Ã³, trÃ¡nh double-confirm
    }
    if (!record.storageCode || record.storageCode.toUpperCase() !== storageCode) {
      throw new BadRequestException(
        `Storage code khÃ´ng khá»›p cho payment ${record.paymentId}: ká»³ vá»ng ${record.storageCode ?? '(khÃ´ng cÃ³)'}, nháº­n ${storageCode}`,
      );
    }
    if (record.amountVnd !== amountVnd) {
      throw new BadRequestException(
        `Sá»‘ tiá»n khÃ´ng khá»›p cho payment ${record.paymentId}: ká»³ vá»ng ${record.amountVnd}, nháº­n ${amountVnd}`,
      );
    }

    const updated = await this.paymentsRepository.updateStatus(record.paymentId, PaymentStatus.PAID);
    if (!updated) throw new NotFoundException(`KhÃ´ng tÃ¬m tháº¥y payment ${record.paymentId}`);
    if (this.affiliateService) await this.affiliateService.recordCommissionForPayment(updated.paymentId);
    return { paymentId: updated.paymentId, status: updated.status };
  }

  /**
   * App Android Notification Listener bÃ¡o vá» sau khi Ä‘á»c Ä‘Æ°á»£c thÃ´ng bÃ¡o
   * biáº¿n Ä‘á»™ng sá»‘ dÆ° MBBank tháº­t trÃªn Ä‘iá»‡n thoáº¡i (xem NotificationSecretGuard
   * + reports/payments/MBBANK_NOTIFICATION_LISTENER_RESEARCH.md). Äiá»‡n
   * thoáº¡i CHá»ˆ Ä‘Æ°a tin â€” hÃ m nÃ y (Backend) má»›i lÃ  nÆ¡i quyáº¿t Ä‘á»‹nh thanh
   * toÃ¡n thÃ nh cÃ´ng, dÃ¹ng Láº I Ä‘Ãºng logic Ä‘á»‘i chiáº¿u cá»§a confirmViaWebhook
   * (matchAndConfirm), khÃ´ng táº¡o Ä‘Æ°á»ng táº¯t riÃªng.
   *
   * Chá»‘ng trÃ¹ng/replay: ghi payment_notifications NGAY Láº¬P Tá»¨C vá»›i
   * transaction_id UNIQUE (migration 014) TRÆ¯á»šC khi xá»­ lÃ½ â€” insert tháº¥t
   * báº¡i vÃ¬ trÃ¹ng nghÄ©a lÃ  request nÃ y Ä‘Ã£ xá»­ lÃ½ trÆ°á»›c Ä‘Ã³ (hoáº·c Ä‘ang xá»­ lÃ½
   * Ä‘á»“ng thá»i), tráº£ láº¡i Ä‘Ãºng káº¿t quáº£ cÅ© (idempotent), KHÃ”NG xá»­ lÃ½ láº¡i,
   * KHÃ”NG coi lÃ  lá»—i (Ä‘iá»‡n thoáº¡i cÃ³ thá»ƒ gá»­i láº¡i do máº¥t máº¡ng/retry).
   * Notification khÃ´ng há»£p lá»‡ (sai Ä‘á»‹nh dáº¡ng/sai sá»‘ tiá»n/khÃ´ng tÃ¬m tháº¥y
   * payment...) -> ghi rejected + lÃ½ do vÃ o payment_notifications
   * (audit log), KHÃ”NG má»Ÿ khoÃ¡ gÃ¬, nÃ©m lá»—i láº¡i cho caller.
   */
  async confirmViaMbbankNotification(
    dto: MbbankNotificationDto,
    deviceId: string,
  ): Promise<{ paymentId: string | null; status: PaymentStatus | null; duplicate: boolean }> {
    const inserted = await this.paymentsRepository.insertNotificationProcessing(
      {
        transactionId: dto.transaction_id,
        amountVnd: dto.amount,
        transactionTime: dto.transaction_time,
        senderName: dto.sender_name,
        senderAccount: dto.sender_account,
        transferContent: dto.transfer_content,
        balanceAfter: dto.balance_after,
        rawNotification: dto.raw_notification,
      },
      deviceId,
    );

    if (!inserted) {
      const existing = await this.paymentsRepository.findNotificationByTransactionId(
        dto.transaction_id,
      );
      if (!existing) {
        throw new BadRequestException(
          `transaction_id ${dto.transaction_id} bá»‹ trÃ¹ng nhÆ°ng khÃ´ng Ä‘á»c láº¡i Ä‘Æ°á»£c â€” thá»­ láº¡i sau`,
        );
      }
      if (existing.status === 'rejected') {
        throw new BadRequestException(
          existing.reject_reason ?? `transaction_id ${dto.transaction_id} Ä‘Ã£ bá»‹ tá»« chá»‘i trÆ°á»›c Ä‘Ã³`,
        );
      }
      const payment = existing.payment_id
        ? await this.paymentsRepository.findById(existing.payment_id)
        : null;
      this.logger.warn(
        `confirmViaMbbankNotification: transaction_id ${dto.transaction_id} Ä‘Ã£ xá»­ lÃ½ trÆ°á»›c Ä‘Ã³ â€” tráº£ láº¡i káº¿t quáº£ cÅ© (replay/retry)`,
      );
      return { paymentId: existing.payment_id, status: payment?.status ?? null, duplicate: true };
    }

    try {
      const result = await this.matchAndConfirm(dto.transfer_content, dto.amount);
      await this.paymentsRepository.markNotificationOutcome(inserted.id, {
        status: 'processed',
        paymentId: result.paymentId,
      });
      await this.paymentDevicesRepository.touchNotification(deviceId, null);
      return { ...result, duplicate: false };
    } catch (err) {
      const message = (err as Error).message;
      await this.paymentsRepository.markNotificationOutcome(inserted.id, {
        status: 'rejected',
        rejectReason: message,
      });
      await this.paymentDevicesRepository.touchNotification(deviceId, message);
      throw err;
    }
  }

  /**
   * Webhook SePay bÃ¡o giao dá»‹ch MB Bank tháº­t (nghiÃªn cá»©u 2026-08-01, xem
   * backend/BACKEND_SETUP.md má»¥c 3c) â€” dÃ¹ng Láº I Ä‘Ãºng logic Ä‘á»‘i chiáº¿u cá»§a
   * matchAndConfirm() vÃ  cÃ¹ng báº£ng chá»‘ng trÃ¹ng payment_notifications vá»›i
   * luá»“ng MBBank Notification Listener (deviceId = null, khÃ´ng pháº£i thiáº¿t
   * bá»‹). SePay cÃ³ thá»ƒ gá»­i cáº£ giao dá»‹ch 'out' náº¿u Owner lá»¡ cáº¥u hÃ¬nh Event
   * type = "Both" trÃªn SePay Dashboard â€” bá» qua AN TOÃ€N (khÃ´ng throw, vÃ¬
   * Ä‘Ã¢y lÃ  hÃ nh vi há»£p lá»‡ tuá»³ cáº¥u hÃ¬nh phÃ­a SePay), chá»‰ xá»­ lÃ½ 'in'.
   */
  async confirmViaSepayWebhook(
    dto: SepayWebhookDto,
  ): Promise<{ paymentId: string | null; status: PaymentStatus | null; duplicate: boolean; ignored: boolean }> {
    if (dto.transferType !== 'in') {
      this.logger.warn(`confirmViaSepayWebhook: bá» qua giao dá»‹ch transferType=${dto.transferType} (id=${dto.id})`);
      return { paymentId: null, status: null, duplicate: false, ignored: true };
    }

    const transactionId = String(dto.id);
    const inserted = await this.paymentsRepository.insertNotificationProcessing(
      {
        transactionId,
        amountVnd: dto.transferAmount,
        transactionTime: dto.transactionDate,
        senderAccount: dto.accountNumber,
        transferContent: dto.content,
        rawNotification: dto as unknown as Record<string, unknown>,
      },
      null,
    );

    if (!inserted) {
      const existing = await this.paymentsRepository.findNotificationByTransactionId(transactionId);
      if (!existing) {
        throw new BadRequestException(
          `transaction_id ${transactionId} bá»‹ trÃ¹ng nhÆ°ng khÃ´ng Ä‘á»c láº¡i Ä‘Æ°á»£c â€” thá»­ láº¡i sau`,
        );
      }
      if (existing.status === 'rejected') {
        throw new BadRequestException(
          existing.reject_reason ?? `transaction_id ${transactionId} Ä‘Ã£ bá»‹ tá»« chá»‘i trÆ°á»›c Ä‘Ã³`,
        );
      }
      const payment = existing.payment_id
        ? await this.paymentsRepository.findById(existing.payment_id)
        : null;
      this.logger.warn(
        `confirmViaSepayWebhook: transaction_id ${transactionId} Ä‘Ã£ xá»­ lÃ½ trÆ°á»›c Ä‘Ã³ â€” tráº£ láº¡i káº¿t quáº£ cÅ© (replay/retry)`,
      );
      return { paymentId: existing.payment_id, status: payment?.status ?? null, duplicate: true, ignored: false };
    }

    try {
      const result = await this.matchAndConfirm(dto.content, dto.transferAmount);
      await this.paymentsRepository.markNotificationOutcome(inserted.id, {
        status: 'processed',
        paymentId: result.paymentId,
      });
      return { ...result, duplicate: false, ignored: false };
    } catch (err) {
      const message = (err as Error).message;
      await this.paymentsRepository.markNotificationOutcome(inserted.id, {
        status: 'rejected',
        rejectReason: message,
      });
      throw err;
    }
  }
}
