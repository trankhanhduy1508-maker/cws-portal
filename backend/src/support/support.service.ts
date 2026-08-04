import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ISupportTicketsRepository,
  SUPPORT_TICKETS_REPOSITORY,
} from './repositories/support-tickets.repository.interface';
import { SupportTicket, SupportTicketStatus } from './domain/support-ticket';

const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 4000;
const ALLOWED_STATUSES: SupportTicketStatus[] = [
  'OPEN',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLVED',
  'DECLINED',
];

@Injectable()
export class SupportService {
  constructor(
    @Inject(SUPPORT_TICKETS_REPOSITORY)
    private readonly ticketsRepository: ISupportTicketsRepository,
    private readonly supabaseService: SupabaseService,
  ) {}

  async create(input: {
    customerId: string;
    jobId?: string | null;
    subject: string;
    message: string;
  }): Promise<SupportTicket> {
    const subject = input.subject?.trim() ?? '';
    const message = input.message?.trim() ?? '';
    if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
      throw new BadRequestException(`Chủ đề phải dài từ 1-${MAX_SUBJECT_LENGTH} ký tự`);
    }
    if (!message || message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(`Nội dung phải dài từ 1-${MAX_MESSAGE_LENGTH} ký tự`);
    }

    const jobId = input.jobId?.trim() || null;
    if (jobId) {
      const { data, error } = await this.supabaseService.getClient()
        .from('render_orders')
        .select('id')
        .eq('id', jobId)
        .eq('customer_id', input.customerId)
        .maybeSingle();
      if (error) throw new BadRequestException('Không kiểm tra được quyền trên Job');
      if (!data) throw new ForbiddenException('Job không thuộc tài khoản của bạn');
    }

    return this.ticketsRepository.create({
      ticketCode: `CWS-SUP-${randomUUID().slice(0, 8).toUpperCase()}`,
      customerId: input.customerId,
      jobId,
      subject,
      message,
    });
  }

  listForCustomer(customerId: string): Promise<SupportTicket[]> {
    return this.ticketsRepository.findByCustomerId(customerId);
  }

  async getForCustomer(id: string, customerId: string): Promise<SupportTicket> {
    const ticket = await this.ticketsRepository.findByIdForCustomer(id, customerId);
    if (!ticket) throw new NotFoundException('Không tìm thấy support ticket');
    return ticket;
  }

  listForAdmin(): Promise<SupportTicket[]> {
    return this.ticketsRepository.findAll();
  }

  async updateForAdmin(input: {
    id: string;
    status: string;
    assignedTo: string | null;
    expectedResponseAt: number | null;
  }): Promise<SupportTicket> {
    if (!ALLOWED_STATUSES.includes(input.status as SupportTicketStatus)) {
      throw new BadRequestException('Trạng thái support ticket không hợp lệ');
    }
    if (
      input.expectedResponseAt !== null &&
      (!Number.isFinite(input.expectedResponseAt) || input.expectedResponseAt < 0)
    ) {
      throw new BadRequestException('expectedResponseAt không hợp lệ');
    }
    const updated = await this.ticketsRepository.updateStatus({
      id: input.id,
      status: input.status as SupportTicketStatus,
      assignedTo: input.assignedTo,
      expectedResponseAt: input.expectedResponseAt,
    });
    if (!updated) throw new NotFoundException('Không tìm thấy support ticket');
    return updated;
  }
}
