import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'crypto';
import { AppConfig } from '../config/configuration';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { calculateExpectedAmountVnd } from './payment-quote';
import { PaymentInstructions, PaymentMethod, PaymentRecord, PaymentStatus } from './payment.types';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async createIntent(dto: CreatePaymentDto, customerId: string) {
    const expectedAmountVnd = calculateExpectedAmountVnd(dto.profileId, dto.fileSizeBytes ?? null);
    const paymentReference = `CWS-${randomBytes(6).toString('hex').toUpperCase()}`;
    const now = Date.now();
    const record = await this.repository.create({
      paymentId: randomUUID(),
      customerId,
      orderId: null,
      expectedAmountVnd,
      receivedAmountVnd: null,
      method: dto.method,
      status: PaymentStatus.AWAITING_TRANSFER,
      paymentReference,
      expiresAt: now + this.config.get('paymentExpiryMinutes', { infer: true }) * 60_000,
      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      confirmationActorId: null,
      operatorNote: null,
    });
    return this.toPublic(record);
  }

  async get(paymentId: string, principal: { userId: string; role: string }) {
    const payment = await this.requirePayment(paymentId);
    if (principal.role !== 'admin' && payment.customerId !== principal.userId) {
      throw new ForbiddenException('Không có quyền xem payment này');
    }
    return this.toPublic(payment);
  }

  async submitEvidence(paymentId: string, customerId: string, claimedAmountVnd: number) {
    const payment = await this.requireOwned(paymentId, customerId);
    if (payment.expiresAt <= Date.now()) throw new BadRequestException('Payment đã hết hạn');
    if (payment.status !== PaymentStatus.AWAITING_TRANSFER) {
      throw new BadRequestException('Payment không ở trạng thái chờ chuyển khoản');
    }
    return this.toPublic(await this.repository.transition({
      paymentId,
      actorId: customerId,
      actorType: 'customer',
      action: 'EVIDENCE_SUBMITTED',
      toStatus: PaymentStatus.UNDER_REVIEW,
      receivedAmountVnd: claimedAmountVnd,
      note: null,
      idempotencyKey: `evidence:${paymentId}:${claimedAmountVnd}`,
    }));
  }

  async confirm(paymentId: string, adminId: string, receivedAmountVnd: number, note: string | undefined, key: string) {
    const payment = await this.requirePayment(paymentId);
    if (payment.expiresAt <= Date.now()) throw new BadRequestException('Payment đã hết hạn');
    if (![PaymentStatus.UNDER_REVIEW, PaymentStatus.UNDERPAID, PaymentStatus.OVERPAID].includes(payment.status)) {
      throw new BadRequestException('Payment chưa sẵn sàng để quản trị viên xác nhận');
    }
    const status = receivedAmountVnd < payment.expectedAmountVnd
      ? PaymentStatus.UNDERPAID
      : receivedAmountVnd > payment.expectedAmountVnd
        ? PaymentStatus.OVERPAID
        : PaymentStatus.CONFIRMED;
    return this.toPublic(await this.repository.transition({
      paymentId, actorId: adminId, actorType: 'admin', action: 'ADMIN_REVIEWED',
      toStatus: status, receivedAmountVnd, note: this.safeNote(note), idempotencyKey: this.requireKey(key),
    }));
  }

  async reject(paymentId: string, adminId: string, note: string | undefined, key: string) {
    return this.toPublic(await this.repository.transition({
      paymentId, actorId: adminId, actorType: 'admin', action: 'REJECTED',
      toStatus: PaymentStatus.REJECTED, receivedAmountVnd: null,
      note: this.safeNote(note), idempotencyKey: this.requireKey(key),
    }));
  }

  async refund(paymentId: string, adminId: string, note: string | undefined, key: string) {
    return this.toPublic(await this.repository.transition({
      paymentId, actorId: adminId, actorType: 'admin', action: 'REFUND_RECORDED',
      toStatus: PaymentStatus.REFUNDED, receivedAmountVnd: null,
      note: this.safeNote(note), idempotencyKey: this.requireKey(key),
    }));
  }

  async consumeForOrder(paymentId: string, customerId: string, orderId: string, expectedAmountVnd: number) {
    return this.repository.consumeForOrder({ paymentId, customerId, orderId, expectedAmountVnd });
  }

  private async requirePayment(id: string) {
    const payment = await this.repository.findById(id);
    if (!payment) throw new NotFoundException('Không tìm thấy payment');
    return payment;
  }

  private async requireOwned(id: string, customerId: string) {
    const payment = await this.requirePayment(id);
    if (payment.customerId !== customerId) throw new ForbiddenException('Payment không thuộc khách hàng');
    return payment;
  }

  private requireKey(key: string) {
    if (!key || key.length < 8 || key.length > 128) throw new BadRequestException('Idempotency-Key không hợp lệ');
    return key;
  }

  private safeNote(note?: string) {
    if (!note) return null;
    return note.replace(/[\r\n]/g, ' ').slice(0, 500);
  }

  private instructions(payment: PaymentRecord): PaymentInstructions {
    if (payment.method === PaymentMethod.MB_BANK_TRANSFER) {
      const bank = this.config.get('paymentBankCode', { infer: true });
      const account = this.config.get('paymentBankAccountNumber', { infer: true });
      const name = this.config.get('paymentBankAccountName', { infer: true });
      const query = new URLSearchParams({
        amount: String(payment.expectedAmountVnd),
        addInfo: payment.paymentReference,
        accountName: name,
      });
      return {
        recipient: name,
        accountLabel: `${bank} • ${account}`,
        vietQrUrl: `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(account)}-compact2.png?${query.toString()}`,
      };
    }
    const receiver = this.config.get('paymentMomoReceiver', { infer: true });
    return { recipient: receiver, accountLabel: 'MoMo thủ công', vietQrUrl: null };
  }

  private toPublic(payment: PaymentRecord) {
    return {
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      method: payment.method,
      status: payment.status,
      paymentReference: payment.paymentReference,
      expectedAmountVnd: payment.expectedAmountVnd,
      receivedAmountVnd: payment.receivedAmountVnd,
      expiresAt: payment.expiresAt,
      instructions: this.instructions(payment),
    };
  }
}
