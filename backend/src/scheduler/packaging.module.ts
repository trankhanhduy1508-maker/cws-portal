import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { PackagingService } from './packaging.service';
import { VideoAssemblyService } from './video-assembly.service';

@Module({
  imports: [FilesModule],
  providers: [PackagingService, VideoAssemblyService],
  exports: [PackagingService],
})
export class PackagingModule {}
