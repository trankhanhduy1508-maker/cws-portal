import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AffiliateService } from './affiliate.service';
import { AffiliateController, AffiliateAdminController } from './affiliate.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleGuard } from '../common/guards/role.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [AffiliateController, AffiliateAdminController],
  providers: [AffiliateService, JwtAuthGuard, RoleGuard],
  exports: [AffiliateService],
})
export class AffiliateModule {}
