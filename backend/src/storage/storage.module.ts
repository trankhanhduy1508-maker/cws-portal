import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { StorageService } from './storage.service';
import { STORAGE_OBJECTS_REPOSITORY } from './repositories/storage-objects.repository.interface';
import { SupabaseStorageObjectsRepository } from './repositories/storage-objects.repository.supabase';
import { REVIEW_IMAGES_REPOSITORY } from './repositories/review-images.repository.interface';
import { SupabaseReviewImagesRepository } from './repositories/review-images.repository.supabase';

@Module({
  imports: [SupabaseModule],
  providers: [
    StorageService,
    { provide: STORAGE_OBJECTS_REPOSITORY, useClass: SupabaseStorageObjectsRepository },
    { provide: REVIEW_IMAGES_REPOSITORY, useClass: SupabaseReviewImagesRepository },
  ],
  exports: [StorageService],
})
export class StorageModule {}
