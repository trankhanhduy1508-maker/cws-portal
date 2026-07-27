import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { JobsModule } from '../jobs/jobs.module';
import { JobsRealtimeServer } from './jobs-realtime.server';

@Module({
  imports: [SupabaseModule, JobsModule],
  providers: [JobsRealtimeServer],
  exports: [JobsRealtimeServer],
})
export class RealtimeModule {}
