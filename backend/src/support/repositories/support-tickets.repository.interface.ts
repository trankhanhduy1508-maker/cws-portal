import { SupportTicket, SupportTicketStatus } from '../domain/support-ticket';

export const SUPPORT_TICKETS_REPOSITORY = Symbol('SUPPORT_TICKETS_REPOSITORY');

export interface ISupportTicketsRepository {
  create(input: {
    ticketCode: string;
    customerId: string;
    jobId: string | null;
    subject: string;
    message: string;
  }): Promise<SupportTicket>;
  findByCustomerId(customerId: string): Promise<SupportTicket[]>;
  findByIdForCustomer(id: string, customerId: string): Promise<SupportTicket | null>;
  findAll(): Promise<SupportTicket[]>;
  updateStatus(input: {
    id: string;
    status: SupportTicketStatus;
    assignedTo: string | null;
    expectedResponseAt: number | null;
  }): Promise<SupportTicket | null>;
}
