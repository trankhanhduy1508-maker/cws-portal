import { Injectable } from '@nestjs/common';

// Legacy class retained for internal compatibility only. Vietnam MVP uses
// server-generated MB/VietQR instructions and explicit admin confirmation.
@Injectable()
export class QrBankProvider {}
