import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PaymentsModule } from '../payments/payments.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { WorkerFleetGateway } from './worker-fleet.gateway';
import { RENDER_ORDERS_REPOSITORY } from './repositories/render-orders.repository.interface';
import { SupabaseRenderOrdersRepository } from './repositories/render-orders.repository.supabase';

@Module({
  imports: [SupabaseModule, PaymentsModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    WorkerFleetGateway,
    {
      provide: RENDER_ORDERS_REPOSITORY,
      useClass: SupabaseRenderOrdersRepository,
    },
  ],
  exports: [JobsService, WorkerFleetGateway, RENDER_ORDERS_REPOSITORY],
})
export class JobsModule {}
