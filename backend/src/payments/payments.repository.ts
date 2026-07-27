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
}

function rowToDomain(row: PaymentRow): PaymentRecord {
  return {
    paymentId: row.id,
    amountVnd: row.amount_vnd,
    method: row.method as PaymentMethod,
    status: row.status as PaymentStatus,
    createdAt: new Date(row.created_at).getTime(),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).getTime() : null,
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
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`create() thất bại: ${error.message}`);
      throw new Error(`Không tạo được payment: ${error.message}`);
    }
    return rowToDomain(data as PaymentRow);
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
