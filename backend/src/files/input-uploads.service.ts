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
  ): Promise<void> {
    const { error } = await this.supabaseService.getClient().from(TABLE).insert({
      object_key: objectKey,
      customer_id: customerId,
      original_name: originalName,
      size_bytes: sizeBytes,
    });
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
}
