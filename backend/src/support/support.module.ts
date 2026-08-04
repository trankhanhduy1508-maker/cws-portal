import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { RoleGuard } from '../common/guards/role.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SUPPORT_TICKETS_REPOSITORY } from './repositories/support-tickets.repository.interface';
import { SupabaseSupportTicketsRepository } from './repositories/support-tickets.repository.supabase';

@Module({
  imports: [SupabaseModule],
  controllers: [SupportController],
  providers: [
    SupportService,
    RoleGuard,
    JwtAuthGuard,
    { provide: SUPPORT_TICKETS_REPOSITORY, useClass: SupabaseSupportTicketsRepository },
  ],
  exports: [SupportService],
})
export class SupportModule {}
