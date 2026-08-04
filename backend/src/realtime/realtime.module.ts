import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { JobsModule } from '../jobs/jobs.module';
import { JobsRealtimeServer } from './jobs-realtime.server';
import { RealtimeController } from './realtime.controller';
import { RealtimeAccessTicketService } from './realtime-access-ticket.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  imports: [SupabaseModule, JobsModule],
  controllers: [RealtimeController],
  providers: [JobsRealtimeServer, RealtimeAccessTicketService, JwtAuthGuard],
  exports: [JobsRealtimeServer],
})
export class RealtimeModule {}
