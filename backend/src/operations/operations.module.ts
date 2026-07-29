import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [SupabaseModule],
  controllers: [OperationsController],
  providers: [OperationsService, JwtAuthGuard, AdminRoleGuard],
})
export class OperationsModule {}
