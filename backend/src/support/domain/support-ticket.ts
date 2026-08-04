export type SupportTicketStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'DECLINED';

export interface SupportTicket {
  id: string;
  ticketCode: string;
  customerId: string;
  jobId: string | null;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  assignedTo: string | null;
  expectedResponseAt: number | null;
  createdAt: number;
  updatedAt: number;
}
