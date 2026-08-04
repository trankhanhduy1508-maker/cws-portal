import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { B2StorageService } from './b2-storage.service';
import { GoogleDriveService } from './google-drive.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [FilesController],
  providers: [B2StorageService, GoogleDriveService, JwtAuthGuard],
  exports: [B2StorageService, GoogleDriveService],
})
export class FilesModule {}
