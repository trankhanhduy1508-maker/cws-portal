import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { WorkerAuthGuard } from './worker-auth.guard';
import { WorkerAuthService } from './worker-auth.service';
import { WorkerRpcController } from './worker-rpc.controller';
import { WorkerRpcService } from './worker-rpc.service';
import { WorkerStorageCapabilityController } from './worker-storage-capability.controller';
import { WorkerStorageCapabilityService } from './worker-storage-capability.service';
import { WorkerEnrollmentController } from './worker-enrollment.controller';
import { WorkerEnrollmentService } from './worker-enrollment.service';

@Module({
  imports: [SupabaseModule],
  controllers: [
    WorkerRpcController,
    WorkerStorageCapabilityController,
    WorkerEnrollmentController,
  ],
  providers: [
    WorkerAuthGuard,
    WorkerAuthService,
    WorkerRpcService,
    WorkerStorageCapabilityService,
    WorkerEnrollmentService,
  ],
})
export class WorkerAuthModule {}
