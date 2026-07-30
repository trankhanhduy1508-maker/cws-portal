import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { INotificationsRepository } from './notifications.repository.interface';
import { Notification } from '../domain/storage-object';

const TABLE = 'notifications';

interface NotificationRow {
  id: string;
  customer_id: string | null;
  job_id: string | null;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

function rowToDomain(row: NotificationRow): Notification {
  return {
    id: row.id,
    customerId: row.customer_id,
    jobId: row.job_id,
    title: row.title,
    content: row.content,
    isRead: row.is_read,
    createdAt: new Date(row.created_at).getTime(),
  };
}

@Injectable()
export class SupabaseNotificationsRepository implements INotificationsRepository {
  private readonly logger = new Logger(SupabaseNotificationsRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(jobId: string | null, title: string, content: string): Promise<Notification> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .insert({ job_id: jobId, title, content })
      .select()
      .single();

    if (error) {
      this.logger.error(`create(${jobId}) thất bại: ${error.message}`);
      throw new Error(`Không tạo được notification: ${error.message}`);
    }
    return rowToDomain(data as NotificationRow);
  }

  async findByJobId(jobId: string): Promise<Notification[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`findByJobId(${jobId}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được notifications: ${error.message}`);
    }
    return (data as NotificationRow[]).map(rowToDomain);
  }
}
