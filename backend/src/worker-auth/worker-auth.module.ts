import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { WorkerAuthGuard } from './worker-auth.guard';
import { WorkerAuthService } from './worker-auth.service';
import { WorkerRpcController } from './worker-rpc.controller';
import { WorkerRpcService } from './worker-rpc.service';

@Module({
  imports: [SupabaseModule],
  controllers: [WorkerRpcController],
  providers: [WorkerAuthGuard, WorkerAuthService, WorkerRpcService],
})
export class WorkerAuthModule {}
