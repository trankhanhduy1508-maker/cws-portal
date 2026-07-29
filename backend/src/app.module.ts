import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { loadConfig } from './config/configuration';
import { AppController } from './app.controller';
import { SupabaseModule } from './supabase/supabase.module';
import { JobsModule } from './jobs/jobs.module';
import { PaymentsModule } from './payments/payments.module';
import { FilesModule } from './files/files.module';
import { OutputsModule } from './outputs/outputs.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { OperationsModule } from './operations/operations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    JobsModule,
    PaymentsModule,
    FilesModule,
    OutputsModule,
    RealtimeModule,
    SchedulerModule,
    OperationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
