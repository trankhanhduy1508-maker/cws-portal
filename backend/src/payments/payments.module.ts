import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { WalletProvider } from './providers/wallet.provider';
import { QrBankProvider } from './providers/qr-bank.provider';

@Module({
  imports: [SupabaseModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, WalletProvider, QrBankProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
