import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const TABLE = 'input_uploads';

@Injectable()
export class InputUploadsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async record(
    objectKey: string,
    customerId: string,
    originalName: string,
    sizeBytes: number,
    security?: {
      contentSha256?: string;
      scannerEngine?: string;
      scannerVersion?: string | null;
      signatureDatabaseVersion?: string | null;
      scannedAt?: string;
    },
  ): Promise<void> {
    const row: Record<string, unknown> = {
      object_key: objectKey,
      customer_id: customerId,
      original_name: originalName,
      size_bytes: sizeBytes,
    };
    if (security) Object.assign(row, {
      security_state: 'INPUT_SAFE', security_verdict: 'CLEAN', security_reason: 'CLEAN',
      content_sha256: security.contentSha256, scanner_engine: security.scannerEngine,
      scanner_version: security.scannerVersion ?? null,
      signature_database_version: security.signatureDatabaseVersion ?? null,
      security_scanned_at: security.scannedAt ?? new Date().toISOString(),
    });
    const { error } = await this.supabaseService.getClient().from(TABLE).insert(row);
    if (error) {
      throw new InternalServerErrorException(
        'Không ghi nhận được quyền sở hữu file upload',
      );
    }
  }

  async assertOwned(objectKey: string, customerId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('object_key')
      .eq('object_key', objectKey)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        'Không xác minh được quyền sở hữu file upload',
      );
    }
    if (!data) {
      throw new ForbiddenException('File upload không thuộc khách hàng này');
    }
  }

  async assertInputSafe(objectKey: string, customerId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('object_key, security_state')
      .eq('object_key', objectKey)
      .eq('customer_id', customerId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException('Không kiểm tra được trạng thái bảo mật input');
    if (!data || data.security_state !== 'INPUT_SAFE') {
      throw new ForbiddenException('Input chưa vượt qua kiểm tra bảo mật');
    }
  }
}
