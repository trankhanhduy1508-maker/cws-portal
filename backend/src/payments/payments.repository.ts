import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PaymentMethod, PaymentRecord, PaymentStatus } from './payment.types';

const TABLE = 'payments';

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
}
