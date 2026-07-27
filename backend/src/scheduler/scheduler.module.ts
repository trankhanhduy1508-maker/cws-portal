import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { JobsModule } from '../jobs/jobs.module';
import { FilesModule } from '../files/files.module';
import { SchedulerService } from './scheduler.service';
import { PackagingService } from './packaging.service';
import { WakeService } from './wake/wake.service';
import { WAKE_PROVIDER } from './wake/wake-provider.interface';
import { NoopWakeProvider } from './wake/noop-wake.provider';

@Module({
  imports: [SupabaseModule, JobsModule, FilesModule],
  providers: [
    SchedulerService,
    PackagingService,
    WakeService,
    { provide: WAKE_PROVIDER, useClass: NoopWakeProvider },
  ],
})
export class SchedulerModule {}
