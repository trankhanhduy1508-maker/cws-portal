import { CustomerCrmSummary } from './domain/customer-profile';

export interface CrmProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface CrmJobRow {
  id: string;
  customer_id: string | null;
  status: string;
  created_at: string;
}

export interface CrmPaymentRow {
  job_id: string | null;
  amount_vnd: number;
  status: string;
  created_at: string;
  confirmed_at: string | null;
}

export function buildCustomerCrmSummaries(
  profiles: CrmProfileRow[],
  jobs: CrmJobRow[],
  payments: CrmPaymentRow[],
): CustomerCrmSummary[] {
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
  for (const payment of payments) {
    if (payment.status !== 'paid' || !payment.job_id) continue;
    const customerId = jobCustomerById.get(payment.job_id);
    if (!customerId) continue;
    paidByCustomer.set(customerId, (paidByCustomer.get(customerId) ?? 0) + payment.amount_vnd);
    const activityAt = Date.parse(payment.confirmed_at ?? payment.created_at);
    lastPaymentByCustomer.set(customerId, Math.max(lastPaymentByCustomer.get(customerId) ?? 0, activityAt));
  }

  return profiles.map((profile) => {
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
