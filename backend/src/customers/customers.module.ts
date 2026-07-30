import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CUSTOMER_PROFILES_REPOSITORY } from './repositories/customer-profiles.repository.interface';
import { SupabaseCustomerProfilesRepository } from './repositories/customer-profiles.repository.supabase';

@Module({
  imports: [SupabaseModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    { provide: CUSTOMER_PROFILES_REPOSITORY, useClass: SupabaseCustomerProfilesRepository },
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
