import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ICustomerProfilesRepository } from './customer-profiles.repository.interface';
import { CustomerProfile } from '../domain/customer-profile';
import { buildCustomerCrmSummaries, CrmJobRow, CrmPaymentRow, CrmProfileRow } from '../customer-crm-summary';

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
  last_login_at: string | null;
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

  async findAllCrmSummaries() {
    const client = this.supabaseService.getClient();
    const [profilesResult, jobsResult, paymentsResult] = await Promise.all([
      client
        .from(TABLE)
        .select('id, full_name, email, created_at, last_login_at')
        .order('created_at', { ascending: false }),
      client
        .from('render_orders')
        .select('id, customer_id, status, created_at'),
      client
        .from('payments')
        .select('job_id, amount_vnd, status, created_at, confirmed_at'),
    ]);

    if (profilesResult.error) throw new Error(`Không đọc được CRM customer: ${profilesResult.error.message}`);
    if (jobsResult.error) throw new Error(`Không đọc được CRM job: ${jobsResult.error.message}`);
    if (paymentsResult.error) throw new Error(`Không đọc được CRM payment: ${paymentsResult.error.message}`);

    return buildCustomerCrmSummaries(
      (profilesResult.data ?? []) as CrmProfileRow[],
      (jobsResult.data ?? []) as CrmJobRow[],
      (paymentsResult.data ?? []) as CrmPaymentRow[],
    );
  }
}
