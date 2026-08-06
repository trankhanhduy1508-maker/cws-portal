import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PackagingModule } from '../scheduler/packaging.module';
import { PackagingService } from '../scheduler/packaging.service';
import { StorageModule } from '../storage/storage.module';
import { FilesModule } from '../files/files.module';
import { PaymentsModule } from '../payments/payments.module';
import { JobsController } from './jobs.controller';
import { FleetController } from './fleet.controller';
import { StaffController } from './staff.controller';
import { HostController } from './host.controller';
import { JobsService } from './jobs.service';
import { WorkerFleetGateway } from './worker-fleet.gateway';
import { PricingService } from './services/pricing.service';
import { PACKAGING_SERVICE } from './services/packaging.interface';
import { RENDER_ORDERS_REPOSITORY } from './repositories/render-orders.repository.interface';
import { SupabaseRenderOrdersRepository } from './repositories/render-orders.repository.supabase';
import { RoleGuard } from '../common/guards/role.guard';
import { StaffIdentityGuard } from '../common/guards/staff-identity.guard';

@Module({
  imports: [SupabaseModule, PackagingModule, StorageModule, FilesModule, PaymentsModule],
  controllers: [JobsController, FleetController, StaffController, HostController],
  providers: [
    JobsService,
    WorkerFleetGateway,
    PricingService,
    RoleGuard,
    StaffIdentityGuard,
    { provide: PACKAGING_SERVICE, useExisting: PackagingService },
    {
      provide: RENDER_ORDERS_REPOSITORY,
      useClass: SupabaseRenderOrdersRepository,
    },
  ],
  exports: [JobsService, WorkerFleetGateway, RENDER_ORDERS_REPOSITORY],
})
export class JobsModule {}
