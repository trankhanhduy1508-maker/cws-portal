import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

const TICKET_TTL_SECONDS = 60;

@Injectable()
export class RealtimeAccessTicketService {
  private readonly logger = new Logger(RealtimeAccessTicketService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async issue(jobId: string, customerId: string): Promise<{ ticket: string; expiresAt: number }> {
    const ticket = randomBytes(32).toString('base64url');
    const ticketHash = createHash('sha256').update(ticket).digest('hex');
    const expiresAt = Date.now() + TICKET_TTL_SECONDS * 1000;
    const { error } = await this.supabaseService.getClient()
      .from('realtime_access_tickets')
      .insert({
        ticket_hash: ticketHash,
        job_id: jobId,
        customer_id: customerId,
        expires_at: new Date(expiresAt).toISOString(),
      });
    if (error) {
      this.logger.error(`issue(${jobId}) thất bại: ${error.message}`);
      throw new Error('Không tạo được realtime access ticket');
    }
    return { ticket, expiresAt };
  }

  async consume(ticket: string | null, jobId: string): Promise<string | null> {
    if (!ticket || ticket.length < 32) return null;
    const ticketHash = createHash('sha256').update(ticket).digest('hex');
    const { data, error } = await this.supabaseService.getClient().rpc(
      'consume_realtime_access_ticket',
      { p_ticket_hash: ticketHash, p_job_id: jobId },
    );
    if (error) {
      this.logger.error(`consume(${jobId}) thất bại: ${error.message}`);
      return null;
    }
    return typeof data === 'string' ? data : null;
  }
}
