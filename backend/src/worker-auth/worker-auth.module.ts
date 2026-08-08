import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { WorkerAuthGuard } from './worker-auth.guard';
import { WorkerAuthService } from './worker-auth.service';
import { WorkerRpcController } from './worker-rpc.controller';
import { WorkerRpcService } from './worker-rpc.service';
import { WorkerStorageCapabilityController } from './worker-storage-capability.controller';
import { WorkerStorageCapabilityService } from './worker-storage-capability.service';

@Module({
  imports: [SupabaseModule],
  controllers: [WorkerRpcController, WorkerStorageCapabilityController],
  providers: [
    WorkerAuthGuard,
    WorkerAuthService,
    WorkerRpcService,
    WorkerStorageCapabilityService,
  ],
})
export class WorkerAuthModule {}
