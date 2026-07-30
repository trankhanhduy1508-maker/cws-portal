import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { JobsModule } from '../jobs/jobs.module';
import { FilesModule } from '../files/files.module';
import { StorageModule } from '../storage/storage.module';
import { PackagingModule } from './packaging.module';
import { SchedulerService } from './scheduler.service';
import { WakeService } from './wake/wake.service';
import { WAKE_PROVIDER } from './wake/wake-provider.interface';
import { NoopWakeProvider } from './wake/noop-wake.provider';

@Module({
  imports: [SupabaseModule, JobsModule, FilesModule, StorageModule, PackagingModule],
  providers: [
    SchedulerService,
    WakeService,
    { provide: WAKE_PROVIDER, useClass: NoopWakeProvider },
  ],
})
export class SchedulerModule {}
