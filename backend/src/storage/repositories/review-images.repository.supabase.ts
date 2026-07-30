import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { IReviewImagesRepository } from './review-images.repository.interface';
import { ReviewImage } from '../domain/storage-object';

const TABLE = 'review_images';

interface ReviewImageRow {
  id: string;
  job_id: string;
  image_path: string;
  display_order: number | null;
  created_at: string;
}

function rowToDomain(row: ReviewImageRow): ReviewImage {
  return {
    id: row.id,
    jobId: row.job_id,
    imagePath: row.image_path,
    displayOrder: row.display_order,
    createdAt: new Date(row.created_at).getTime(),
  };
}

@Injectable()
export class SupabaseReviewImagesRepository implements IReviewImagesRepository {
  private readonly logger = new Logger(SupabaseReviewImagesRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findByJobId(jobId: string): Promise<ReviewImage[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('job_id', jobId)
      .order('display_order', { ascending: true });

    if (error) {
      this.logger.error(`findByJobId(${jobId}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được review images: ${error.message}`);
    }
    return (data as ReviewImageRow[]).map(rowToDomain);
  }

  async replaceForJob(jobId: string, imagePaths: string[]): Promise<ReviewImage[]> {
    const client = this.supabaseService.getClient();

    const { error: deleteError } = await client.from(TABLE).delete().eq('job_id', jobId);
    if (deleteError) {
      this.logger.error(`replaceForJob(${jobId}) xóa cũ thất bại: ${deleteError.message}`);
      throw new Error(`Không xóa được review images cũ: ${deleteError.message}`);
    }

    if (imagePaths.length === 0) return [];

    const rows = imagePaths.map((imagePath, index) => ({
      job_id: jobId,
      image_path: imagePath,
      display_order: index,
    }));

    const { data, error } = await client.from(TABLE).insert(rows).select();
    if (error) {
      this.logger.error(`replaceForJob(${jobId}) insert thất bại: ${error.message}`);
      throw new Error(`Không lưu được review images mới: ${error.message}`);
    }
    return (data as ReviewImageRow[]).map(rowToDomain);
  }
}
