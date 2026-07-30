import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { IDownloadsRepository } from './downloads.repository.interface';
import { DownloadLog } from '../domain/storage-object';

const TABLE = 'downloads';

interface DownloadRow {
  id: string;
  job_id: string;
  customer_id: string | null;
  downloaded_at: string;
  ip_address: string | null;
}

function rowToDomain(row: DownloadRow): DownloadLog {
  return {
    id: row.id,
    jobId: row.job_id,
    customerId: row.customer_id,
    downloadedAt: new Date(row.downloaded_at).getTime(),
    ipAddress: row.ip_address,
  };
}

@Injectable()
export class SupabaseDownloadsRepository implements IDownloadsRepository {
  private readonly logger = new Logger(SupabaseDownloadsRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async log(jobId: string, ipAddress: string | null): Promise<DownloadLog> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .insert({ job_id: jobId, ip_address: ipAddress })
      .select()
      .single();

    if (error) {
      this.logger.error(`log(${jobId}) thất bại: ${error.message}`);
      throw new Error(`Không ghi được log download: ${error.message}`);
    }
    return rowToDomain(data as DownloadRow);
  }
}
