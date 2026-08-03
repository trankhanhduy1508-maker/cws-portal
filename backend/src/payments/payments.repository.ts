import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  PaymentMethod,
  PaymentRecord,
  PaymentReconciliationAnomaly,
  PaymentStatus,
} from './payment.types';

const TABLE = 'payments';
const NOTIFICATIONS_TABLE = 'payment_notifications';
const RECONCILIATION_VIEW = 'payment_reconciliation_anomalies';

interface ReconciliationAnomalyRow {
  anomaly_type: string;
  order_id: string;
  storage_code: string | null;
  order_status: string | null;
  payment_status: string | null;
  reference_time: string;
  amount_vnd: number | null;
}

function anomalyRowToDomain(row: ReconciliationAnomalyRow): PaymentReconciliationAnomaly {
  return {
    anomalyType: row.anomaly_type as PaymentReconciliationAnomaly['anomalyType'],
    orderId: row.order_id,
    storageCode: row.storage_code,
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    referenceTime: new Date(row.reference_time).getTime(),
    amountVnd: row.amount_vnd,
  };
}

export interface PaymentNotificationRow {
  id: number;
  transaction_id: string;
  status: 'processing' | 'processed' | 'rejected';
  reject_reason: string | null;
  payment_id: string | null;
}

/** Postgres unique_violation — dùng để phát hiện transaction_id đã tồn
 * tại (race condition an toàn hơn "select trước rồi insert sau", 2 request
 * đồng thời cùng transaction_id vẫn chỉ 1 cái insert thành công). */
const POSTGRES_UNIQUE_VIOLATION = '23505';

interface PaymentRow {
  id: string;
  amount_vnd: number;
  method: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  payment_code: string | null;
  transfer_content: string | null;
  job_id: string | null;
  storage_code: string | null;
  bank_name: string | null;
  account_number: string | null;
  qr_image_url: string | null;
}

function rowToDomain(row: PaymentRow): PaymentRecord {
  return {
    paymentId: row.id,
    amountVnd: row.amount_vnd,
    method: row.method as PaymentMethod,
    status: row.status as PaymentStatus,
    createdAt: new Date(row.created_at).getTime(),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).getTime() : null,
    paymentCode: row.payment_code,
    transferContent: row.transfer_content,
    jobId: row.job_id,
    storageCode: row.storage_code,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    qrImageUrl: row.qr_image_url,
  };
}

@Injectable()
export class PaymentsRepository {
  private readonly logger = new Logger(PaymentsRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(record: PaymentRecord): Promise<PaymentRecord> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .insert({
        id: record.paymentId,
        amount_vnd: record.amountVnd,
        method: record.method,
        status: record.status,
        payment_code: record.paymentCode,
        transfer_content: record.transferContent,
        job_id: record.jobId,
        storage_code: record.storageCode,
        bank_name: record.bankName,
        account_number: record.accountNumber,
        qr_image_url: record.qrImageUrl,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`create() thất bại: ${error.message}`);
      throw new Error(`Không tạo được payment: ${error.message}`);
    }
    return rowToDomain(data as PaymentRow);
  }

  async findByPaymentCode(paymentCode: string): Promise<PaymentRecord | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('payment_code', paymentCode)
      .maybeSingle();

    if (error) {
      this.logger.error(`findByPaymentCode(${paymentCode}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được payment theo mã: ${error.message}`);
    }
    return data ? rowToDomain(data as PaymentRow) : null;
  }

  async updateStatus(paymentId: string, status: PaymentStatus): Promise<PaymentRecord | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .update({
        status,
        confirmed_at: status === PaymentStatus.PAID ? new Date().toISOString() : null,
      })
      .eq('id', paymentId)
      .select()
      .maybeSingle();

    if (error) {
      this.logger.error(`updateStatus(${paymentId}) thất bại: ${error.message}`);
      throw new Error(`Không cập nhật được payment: ${error.message}`);
    }
    return data ? rowToDomain(data as PaymentRow) : null;
  }

  async findById(paymentId: string): Promise<PaymentRecord | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (error) {
      this.logger.error(`findById(${paymentId}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được payment: ${error.message}`);
    }
    return data ? rowToDomain(data as PaymentRow) : null;
  }

  /** Ghi 1 dòng payment_notifications với status='processing' NGAY LẬP
   * TỨC khi nhận request — transaction_id UNIQUE (migration 014) là cơ
   * chế chống trùng/replay THẬT SỰ (không phải chỉ check-rồi-insert, dễ
   * dính race condition nếu 2 request cùng transaction_id đến gần như
   * đồng thời). Trả về `null` nếu transaction_id đã tồn tại — gọi nơi
   * (PaymentsService) tự lấy dòng cũ qua findNotificationByTransactionId()
   * để trả lại kết quả cũ, KHÔNG xử lý lại.
   *
   * Dùng chung cho MỌI nguồn báo thanh toán (app Android MBBank Notification
   * Listener LẪN webhook SePay) — nhận input tổng quát thay vì DTO riêng
   * của 1 nguồn, tránh phải ép kiểu giả khi thêm nguồn mới. `deviceId`
   * chỉ có ý nghĩa với app Android (migration 015, FK NULLABLE tới
   * payment_devices) — `null` cho các nguồn không phải thiết bị (SePay). */
  async insertNotificationProcessing(
    input: {
      transactionId: string;
      amountVnd: number;
      transactionTime?: string | null;
      senderName?: string | null;
      senderAccount?: string | null;
      transferContent: string;
      balanceAfter?: number | null;
      rawNotification?: Record<string, unknown> | null;
    },
    deviceId: string | null,
  ): Promise<PaymentNotificationRow | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(NOTIFICATIONS_TABLE)
      .insert({
        transaction_id: input.transactionId,
        amount_vnd: input.amountVnd,
        transaction_time: input.transactionTime ?? null,
        sender_name: input.senderName ?? null,
        sender_account: input.senderAccount ?? null,
        transfer_content: input.transferContent,
        balance_after: input.balanceAfter ?? null,
        raw_notification: input.rawNotification ?? null,
        status: 'processing',
        device_id: deviceId,
      })
      .select('id, transaction_id, status, reject_reason, payment_id')
      .single();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) return null;
      this.logger.error(
        `insertNotificationProcessing(${input.transactionId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không ghi được payment_notifications: ${error.message}`);
    }
    return data as PaymentNotificationRow;
  }

  async findNotificationByTransactionId(
    transactionId: string,
  ): Promise<PaymentNotificationRow | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(NOTIFICATIONS_TABLE)
      .select('id, transaction_id, status, reject_reason, payment_id')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (error) {
      this.logger.error(
        `findNotificationByTransactionId(${transactionId}) thất bại: ${error.message}`,
      );
      throw new Error(`Không đọc được payment_notifications: ${error.message}`);
    }
    return data as PaymentNotificationRow | null;
  }

  async markNotificationOutcome(
    id: number,
    outcome: { status: 'processed' | 'rejected'; rejectReason?: string; paymentId?: string },
  ): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from(NOTIFICATIONS_TABLE)
      .update({
        status: outcome.status,
        reject_reason: outcome.rejectReason ?? null,
        payment_id: outcome.paymentId ?? null,
      })
      .eq('id', id);

    if (error) {
      this.logger.error(`markNotificationOutcome(${id}) thất bại: ${error.message}`);
      throw new Error(`Không cập nhật được payment_notifications: ${error.message}`);
    }
  }

  /** Payment/refund safety net (2026-08-03, xem
   * worker_migrations/015_payment_reconciliation_view.sql +
   * DECISIONS.md "Payment reconciliation") — đọc view CHỈ ĐỌC
   * `payment_reconciliation_anomalies`, KHÔNG viết lại logic phát hiện
   * bất thường ở đây (view là nguồn sự thật duy nhất). Sắp mới nhất lên
   * đầu (`reference_time desc`) để Admin thấy bất thường gần đây trước. */
  async listReconciliationAnomalies(): Promise<PaymentReconciliationAnomaly[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(RECONCILIATION_VIEW)
      .select('*')
      .order('reference_time', { ascending: false });

    if (error) {
      this.logger.error(`listReconciliationAnomalies() thất bại: ${error.message}`);
      throw new Error(`Không đọc được payment_reconciliation_anomalies: ${error.message}`);
    }
    return (data as ReconciliationAnomalyRow[]).map(anomalyRowToDomain);
  }
}
