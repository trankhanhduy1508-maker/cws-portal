import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { IStorageObjectsRepository } from './storage-objects.repository.interface';
import { StorageObject } from '../domain/storage-object';

const TABLE = 'storage_objects';

interface StorageObjectRow {
  id: string;
  job_id: string;
  source_path: string | null;
  review_path: string | null;
  final_path: string | null;
  log_path: string | null;
  uploaded_at: string;
}

function rowToDomain(row: StorageObjectRow): StorageObject {
  return {
    id: row.id,
    jobId: row.job_id,
    sourcePath: row.source_path,
    reviewPath: row.review_path,
    finalPath: row.final_path,
    logPath: row.log_path,
    uploadedAt: new Date(row.uploaded_at).getTime(),
  };
}

@Injectable()
export class SupabaseStorageObjectsRepository implements IStorageObjectsRepository {
  private readonly logger = new Logger(SupabaseStorageObjectsRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findByJobId(jobId: string): Promise<StorageObject | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();

    if (error) {
      this.logger.error(`findByJobId(${jobId}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được storage object: ${error.message}`);
    }
    return data ? rowToDomain(data as StorageObjectRow) : null;
  }

  async upsertByJobId(
    jobId: string,
    paths: Partial<Pick<StorageObject, 'sourcePath' | 'reviewPath' | 'finalPath' | 'logPath'>>,
  ): Promise<StorageObject> {
    const existing = await this.findByJobId(jobId);

    const row = {
      job_id: jobId,
      source_path: paths.sourcePath ?? existing?.sourcePath ?? null,
      review_path: paths.reviewPath ?? existing?.reviewPath ?? null,
      final_path: paths.finalPath ?? existing?.finalPath ?? null,
      log_path: paths.logPath ?? existing?.logPath ?? null,
    };

    const query = existing
      ? this.supabaseService.getClient().from(TABLE).update(row).eq('job_id', jobId)
      : this.supabaseService.getClient().from(TABLE).insert(row);

    const { data, error } = await query.select().single();

    if (error) {
      this.logger.error(`upsertByJobId(${jobId}) thất bại: ${error.message}`);
      throw new Error(`Không lưu được storage object: ${error.message}`);
    }
    return rowToDomain(data as StorageObjectRow);
  }
}
