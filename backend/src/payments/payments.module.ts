import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PaymentsController } from './payments.controller';
import { PaymentNotificationController } from './payment-notification.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PaymentDevicesRepository } from './payment-devices.repository';
import { QrBankProvider } from './providers/qr-bank.provider';
import { RoleGuard } from '../common/guards/role.guard';
import { DeviceSignatureGuard } from '../common/guards/device-signature.guard';
import { DeviceHeartbeatGuard } from '../common/guards/device-heartbeat.guard';
import { SepayWebhookGuard } from '../common/guards/sepay-webhook.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [PaymentsController, PaymentNotificationController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    PaymentDevicesRepository,
    QrBankProvider,
    RoleGuard,
    DeviceSignatureGuard,
    DeviceHeartbeatGuard,
    SepayWebhookGuard,
    JwtAuthGuard,
  ],
  exports: [PaymentsService, PaymentDevicesRepository],
})
export class PaymentsModule {}
