import { Injectable } from '@nestjs/common';

// Legacy class retained for internal compatibility only. It is not registered
// in PaymentsModule and cannot auto-confirm a customer payment.
@Injectable()
export class WalletProvider {}
