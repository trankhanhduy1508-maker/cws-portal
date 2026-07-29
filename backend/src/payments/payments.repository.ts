import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PaymentMethod, PaymentRecord, PaymentStatus } from './payment.types';

const TABLE = 'payments';

interface PaymentRow {
  id: string;
  customer_id: string;
  order_id: string | null;
  amount_vnd: number;
  received_amount_vnd: number | null;
  method: string;
  status: string;
  payment_reference: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  confirmation_actor_id: string | null;
  operator_note: string | null;
}

function rowToDomain(row: PaymentRow): PaymentRecord {
  return {
    paymentId: row.id,
    customerId: row.customer_id,
    orderId: row.order_id,
    expectedAmountVnd: row.amount_vnd,
    receivedAmountVnd: row.received_amount_vnd,
    method: row.method as PaymentMethod,
    status: row.status as PaymentStatus,
    paymentReference: row.payment_reference,
    expiresAt: new Date(row.expires_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).getTime() : null,
    confirmationActorId: row.confirmation_actor_id,
    operatorNote: row.operator_note,
  };
}

@Injectable()
export class PaymentsRepository {
  private readonly logger = new Logger(PaymentsRepository.name);
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(record: PaymentRecord): Promise<PaymentRecord> {
    const { data, error } = await this.supabaseService.getClient().from(TABLE).insert({
      id: record.paymentId,
      customer_id: record.customerId,
      order_id: record.orderId,
      amount_vnd: record.expectedAmountVnd,
      received_amount_vnd: record.receivedAmountVnd,
      method: record.method,
      status: record.status,
      payment_reference: record.paymentReference,
      expires_at: new Date(record.expiresAt).toISOString(),
    }).select().single();
    if (error) throw new Error('Không tạo được payment');
    return rowToDomain(data as PaymentRow);
  }

  async findById(paymentId: string): Promise<PaymentRecord | null> {
    const { data, error } = await this.supabaseService.getClient()
      .from(TABLE).select('*').eq('id', paymentId).maybeSingle();
    if (error) {
      this.logger.error('Không đọc được payment');
      throw new Error('Không đọc được payment');
    }
    return data ? rowToDomain(data as PaymentRow) : null;
  }

  async transition(input: {
    paymentId: string;
    actorId: string;
    actorType: 'customer' | 'admin' | 'system';
    action: string;
    toStatus: PaymentStatus;
    receivedAmountVnd: number | null;
    note: string | null;
    idempotencyKey: string;
    requestFingerprint: string;
  }): Promise<PaymentRecord> {
    const { data, error } = await this.supabaseService.getClient().rpc('transition_payment_p2', {
      p_payment_id: input.paymentId,
      p_actor_id: input.actorId,
      p_actor_type: input.actorType,
      p_action: input.action,
      p_to_status: input.toStatus,
      p_received_amount_vnd: input.receivedAmountVnd,
      p_note: input.note,
      p_idempotency_key: input.idempotencyKey,
      p_request_fingerprint: input.requestFingerprint,
    });
    if (error) throw new Error('Không thể chuyển trạng thái payment');
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Payment transition không trả về kết quả');
    return rowToDomain(row as PaymentRow);
  }

  async consumeForOrder(input: {
    paymentId: string;
    customerId: string;
    orderId: string;
    expectedAmountVnd: number;
  }): Promise<PaymentRecord> {
    const { data, error } = await this.supabaseService.getClient().rpc('consume_payment_p2', {
      p_payment_id: input.paymentId,
      p_customer_id: input.customerId,
      p_order_id: input.orderId,
      p_expected_amount_vnd: input.expectedAmountVnd,
    });
    if (error) throw new Error('Payment không hợp lệ, không thuộc khách hàng, đã dùng hoặc sai số tiền');
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Payment không thể sử dụng');
    return rowToDomain(row as PaymentRow);
  }
}
