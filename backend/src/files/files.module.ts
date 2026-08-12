import { Module, forwardRef } from '@nestjs/common';
import { FilesController } from './files.controller';
import { B2StorageService } from './b2-storage.service';
import { GoogleDriveService } from './google-drive.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { InputUploadsService } from './input-uploads.service';
import { InputSecurityService } from './input-security.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [SupabaseModule, forwardRef(() => JobsModule)],
  controllers: [FilesController],
  providers: [B2StorageService, GoogleDriveService, InputUploadsService, InputSecurityService],
  exports: [B2StorageService, GoogleDriveService, InputUploadsService, InputSecurityService],
})
export class FilesModule {}
