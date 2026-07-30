import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ICustomerProfilesRepository } from './customer-profiles.repository.interface';
import { CustomerProfile } from '../domain/customer-profile';

const TABLE = 'customer_profiles';

interface CustomerProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  preferred_contact: string | null;
  marketing_consent: boolean;
  created_at: string;
  updated_at: string;
}

function rowToDomain(row: CustomerProfileRow): CustomerProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    preferredContact: row.preferred_contact,
    marketingConsent: row.marketing_consent,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

@Injectable()
export class SupabaseCustomerProfilesRepository implements ICustomerProfilesRepository {
  private readonly logger = new Logger(SupabaseCustomerProfilesRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(id: string): Promise<CustomerProfile | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`findById(${id}) thất bại: ${error.message}`);
      throw new Error(`Không đọc được customer profile: ${error.message}`);
    }
    return data ? rowToDomain(data as CustomerProfileRow) : null;
  }

  async findAll(): Promise<CustomerProfile[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`findAll() thất bại: ${error.message}`);
      throw new Error(`Không đọc được danh sách customer: ${error.message}`);
    }
    return (data as CustomerProfileRow[]).map(rowToDomain);
  }
}
