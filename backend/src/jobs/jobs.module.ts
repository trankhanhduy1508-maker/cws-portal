import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PackagingModule } from '../scheduler/packaging.module';
import { PackagingService } from '../scheduler/packaging.service';
import { StorageModule } from '../storage/storage.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { WorkerFleetGateway } from './worker-fleet.gateway';
import { PACKAGING_SERVICE } from './services/packaging.interface';
import { RENDER_ORDERS_REPOSITORY } from './repositories/render-orders.repository.interface';
import { SupabaseRenderOrdersRepository } from './repositories/render-orders.repository.supabase';

@Module({
  imports: [SupabaseModule, PackagingModule, StorageModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    WorkerFleetGateway,
    { provide: PACKAGING_SERVICE, useExisting: PackagingService },
    {
      provide: RENDER_ORDERS_REPOSITORY,
      useClass: SupabaseRenderOrdersRepository,
    },
  ],
  exports: [JobsService, WorkerFleetGateway, RENDER_ORDERS_REPOSITORY],
})
export class JobsModule {}
