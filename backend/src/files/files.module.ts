import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { B2StorageService } from './b2-storage.service';
import { GoogleDriveService } from './google-drive.service';

@Module({
  controllers: [FilesController],
  providers: [B2StorageService, GoogleDriveService],
  exports: [B2StorageService, GoogleDriveService],
})
export class FilesModule {}
