import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { FilesModule } from '../files/files.module';
import { StorageService } from './storage.service';
import { PreviewService } from './preview.service';
import { STORAGE_OBJECTS_REPOSITORY } from './repositories/storage-objects.repository.interface';
import { SupabaseStorageObjectsRepository } from './repositories/storage-objects.repository.supabase';
import { REVIEW_IMAGES_REPOSITORY } from './repositories/review-images.repository.interface';
import { SupabaseReviewImagesRepository } from './repositories/review-images.repository.supabase';
import { DOWNLOADS_REPOSITORY } from './repositories/downloads.repository.interface';
import { SupabaseDownloadsRepository } from './repositories/downloads.repository.supabase';
import { WORKER_LOGS_REPOSITORY } from './repositories/worker-logs.repository.interface';
import { SupabaseWorkerLogsRepository } from './repositories/worker-logs.repository.supabase';

@Module({
  imports: [SupabaseModule, FilesModule],
  providers: [
    StorageService,
    PreviewService,
    { provide: STORAGE_OBJECTS_REPOSITORY, useClass: SupabaseStorageObjectsRepository },
    { provide: REVIEW_IMAGES_REPOSITORY, useClass: SupabaseReviewImagesRepository },
    { provide: DOWNLOADS_REPOSITORY, useClass: SupabaseDownloadsRepository },
    { provide: WORKER_LOGS_REPOSITORY, useClass: SupabaseWorkerLogsRepository },
  ],
  exports: [StorageService, PreviewService],
})
export class StorageModule {}
