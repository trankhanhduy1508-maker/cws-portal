import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { B2StorageService } from './b2-storage.service';
import { GoogleDriveService } from './google-drive.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { InputUploadsService } from './input-uploads.service';

@Module({
  imports: [SupabaseModule],
  controllers: [FilesController],
  providers: [B2StorageService, GoogleDriveService, InputUploadsService],
  exports: [B2StorageService, GoogleDriveService, InputUploadsService],
})
export class FilesModule {}
