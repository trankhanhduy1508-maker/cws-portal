import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SupportTicket, SupportTicketStatus } from '../domain/support-ticket';
import { ISupportTicketsRepository } from './support-tickets.repository.interface';

const TABLE = 'support_tickets';

interface SupportTicketRow {
  id: string;
  ticket_code: string;
  customer_id: string;
  job_id: string | null;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  assigned_to: string | null;
  expected_response_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToDomain(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    customerId: row.customer_id,
    jobId: row.job_id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    assignedTo: row.assigned_to,
    expectedResponseAt: row.expected_response_at
      ? new Date(row.expected_response_at).getTime()
      : null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

@Injectable()
export class SupabaseSupportTicketsRepository implements ISupportTicketsRepository {
  private readonly logger = new Logger(SupabaseSupportTicketsRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(input: {
    ticketCode: string;
    customerId: string;
    jobId: string | null;
    subject: string;
    message: string;
  }): Promise<SupportTicket> {
    const { data, error } = await this.supabaseService.getClient()
      .from(TABLE)
      .insert({
        ticket_code: input.ticketCode,
        customer_id: input.customerId,
        job_id: input.jobId,
        subject: input.subject,
        message: input.message,
      })
      .select()
      .single();
    if (error) {
      this.logger.error(`create(${input.ticketCode}) thất bại: ${error.message}`);
      throw new Error(`Không tạo được support ticket: ${error.message}`);
    }
    return rowToDomain(data as SupportTicketRow);
  }

  async findByCustomerId(customerId: string): Promise<SupportTicket[]> {
    const { data, error } = await this.supabaseService.getClient()
      .from(TABLE)
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (error) {
      this.logger.error(`findByCustomerId(${customerId}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được support ticket: ${error.message}`);
    }
    return (data as SupportTicketRow[]).map(rowToDomain);
  }

  async findByIdForCustomer(id: string, customerId: string): Promise<SupportTicket | null> {
    const { data, error } = await this.supabaseService.getClient()
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('customer_id', customerId)
      .maybeSingle();
    if (error) {
      this.logger.error(`findByIdForCustomer(${id}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được support ticket: ${error.message}`);
    }
    return data ? rowToDomain(data as SupportTicketRow) : null;
  }

  async findAll(): Promise<SupportTicket[]> {
    const { data, error } = await this.supabaseService.getClient()
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      this.logger.error(`findAll() thất bại: ${error.message}`);
      throw new Error(`Không đọc được danh sách support ticket: ${error.message}`);
    }
    return (data as SupportTicketRow[]).map(rowToDomain);
  }

  async updateStatus(input: {
    id: string;
    status: SupportTicketStatus;
    assignedTo: string | null;
    expectedResponseAt: number | null;
  }): Promise<SupportTicket | null> {
    const { data, error } = await this.supabaseService.getClient()
      .from(TABLE)
      .update({
        status: input.status,
        assigned_to: input.assignedTo,
        expected_response_at: input.expectedResponseAt
          ? new Date(input.expectedResponseAt).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .select()
      .maybeSingle();
    if (error) {
      this.logger.error(`updateStatus(${input.id}) thất bại: ${error.message}`);
      throw new Error(`Không cập nhật được support ticket: ${error.message}`);
    }
    return data ? rowToDomain(data as SupportTicketRow) : null;
  }
}
