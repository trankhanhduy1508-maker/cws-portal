import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { loadConfig } from './config/configuration';
import { AppController } from './app.controller';
import { SupabaseModule } from './supabase/supabase.module';
import { JobsModule } from './jobs/jobs.module';
import { PaymentsModule } from './payments/payments.module';
import { StorageModule } from './storage/storage.module';
import { FilesModule } from './files/files.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    JobsModule,
    PaymentsModule,
    StorageModule,
    FilesModule,
    RealtimeModule,
    SchedulerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
