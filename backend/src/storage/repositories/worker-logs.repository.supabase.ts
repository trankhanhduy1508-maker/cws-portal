import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { IWorkerLogsRepository } from './worker-logs.repository.interface';
import { WorkerLog } from '../domain/storage-object';

const TABLE = 'worker_logs';

interface WorkerLogRow {
  id: string;
  job_id: string;
  worker_name: string | null;
  message: string | null;
  level: string;
  created_at: string;
}

function rowToDomain(row: WorkerLogRow): WorkerLog {
  return {
    id: row.id,
    jobId: row.job_id,
    workerName: row.worker_name,
    message: row.message,
    level: row.level,
    createdAt: new Date(row.created_at).getTime(),
  };
}

@Injectable()
export class SupabaseWorkerLogsRepository implements IWorkerLogsRepository {
  private readonly logger = new Logger(SupabaseWorkerLogsRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async log(jobId: string, workerName: string | null, message: string | null, level: string): Promise<WorkerLog> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .insert({ job_id: jobId, worker_name: workerName, message, level })
      .select()
      .single();

    if (error) {
      this.logger.error(`log(${jobId}) thất bại: ${error.message}`);
      throw new Error(`Không ghi được worker log: ${error.message}`);
    }
    return rowToDomain(data as WorkerLogRow);
  }

  async findByJobId(jobId: string): Promise<WorkerLog[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(`findByJobId(${jobId}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được worker logs: ${error.message}`);
    }
    return (data as WorkerLogRow[]).map(rowToDomain);
  }
}
