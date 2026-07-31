import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PaymentsController } from './payments.controller';
import { PaymentNotificationController } from './payment-notification.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { QrBankProvider } from './providers/qr-bank.provider';
import { RoleGuard } from '../common/guards/role.guard';
import { NotificationSecretGuard } from '../common/guards/notification-secret.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [PaymentsController, PaymentNotificationController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    QrBankProvider,
    RoleGuard,
    NotificationSecretGuard,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
