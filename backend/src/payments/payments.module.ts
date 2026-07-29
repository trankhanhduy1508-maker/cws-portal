import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';

@Module({
  imports: [SupabaseModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, JwtAuthGuard, AdminRoleGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
