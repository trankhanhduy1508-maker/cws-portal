import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { PackagingService } from './packaging.service';

@Module({
  imports: [FilesModule],
  providers: [PackagingService],
  exports: [PackagingService],
})
export class PackagingModule {}
