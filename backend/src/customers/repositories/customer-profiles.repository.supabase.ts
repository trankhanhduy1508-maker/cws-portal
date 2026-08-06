import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ICustomerProfilesRepository } from './customer-profiles.repository.interface';
import { CustomerCrmSummary, CustomerProfile } from '../domain/customer-profile';

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

interface CrmJobRow {
  id: string;
  customer_id: string | null;
  status: string;
  created_at: string;
}

interface CrmPaymentRow {
  job_id: string | null;
  amount_vnd: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
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

  async findAllCrmSummaries(): Promise<CustomerCrmSummary[]> {
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

    const jobs = (jobsResult.data ?? []) as CrmJobRow[];
    const jobsByCustomer = new Map<string, CrmJobRow[]>();
    const jobCustomerById = new Map<string, string>();
    for (const job of jobs) {
      if (!job.customer_id) continue;
      jobCustomerById.set(job.id, job.customer_id);
      const customerJobs = jobsByCustomer.get(job.customer_id) ?? [];
      customerJobs.push(job);
      jobsByCustomer.set(job.customer_id, customerJobs);
    }

    const paidByCustomer = new Map<string, number>();
    const lastPaymentByCustomer = new Map<string, number>();
    for (const payment of (paymentsResult.data ?? []) as CrmPaymentRow[]) {
      if (payment.status !== 'paid' || !payment.job_id) continue;
      const customerId = jobCustomerById.get(payment.job_id);
      if (!customerId) continue;
      paidByCustomer.set(customerId, (paidByCustomer.get(customerId) ?? 0) + payment.amount_vnd);
      const activityAt = Date.parse(payment.confirmed_at ?? payment.created_at);
      lastPaymentByCustomer.set(customerId, Math.max(lastPaymentByCustomer.get(customerId) ?? 0, activityAt));
    }

    return ((profilesResult.data ?? []) as Pick<CustomerProfileRow, 'id' | 'full_name' | 'email' | 'created_at' | 'last_login_at'>[]).map((profile) => {
      const customerJobs = (jobsByCustomer.get(profile.id) ?? []).sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
      );
      const registeredAt = Date.parse(profile.created_at);
      const lastLoginAt = profile.last_login_at ? Date.parse(profile.last_login_at) : 0;
      const lastJobAt = customerJobs[0] ? Date.parse(customerJobs[0].created_at) : 0;
      const lastPaymentAt = lastPaymentByCustomer.get(profile.id) ?? 0;
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        registeredAt,
        lastActiveAt: Math.max(registeredAt, lastLoginAt, lastJobAt, lastPaymentAt),
        totalJobs: customerJobs.length,
        completedJobs: customerJobs.filter((job) => job.status === 'finished').length,
        totalPaidVnd: paidByCustomer.get(profile.id) ?? 0,
        latestJob: customerJobs[0]
          ? { id: customerJobs[0].id, status: customerJobs[0].status, createdAt: Date.parse(customerJobs[0].created_at) }
          : null,
        lifecycleStatus: customerJobs.length === 0 ? 'new' : customerJobs.length > 1 ? 'returning' : 'rendered',
      };
    });
  }
}
