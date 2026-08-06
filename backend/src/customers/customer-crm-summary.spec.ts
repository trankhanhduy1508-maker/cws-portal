import { buildCustomerCrmSummaries } from './customer-crm-summary';

describe('buildCustomerCrmSummaries', () => {
  it('aggregates jobs and only linked paid payments, with latest activity and lifecycle', () => {
    const result = buildCustomerCrmSummaries(
      [
        { id: 'c1', email: 'one@example.com', full_name: 'One', created_at: '2026-01-01T00:00:00Z', last_login_at: '2026-01-03T00:00:00Z' },
        { id: 'c2', email: null, full_name: null, created_at: '2026-01-01T00:00:00Z', last_login_at: null },
      ],
      [
        { id: 'j1', customer_id: 'c1', status: 'finished', created_at: '2026-01-04T00:00:00Z' },
        { id: 'j2', customer_id: 'c1', status: 'rendering', created_at: '2026-01-05T00:00:00Z' },
        { id: 'orphan-job', customer_id: null, status: 'finished', created_at: '2026-01-06T00:00:00Z' },
      ],
      [
        { job_id: 'j1', amount_vnd: 100000, status: 'paid', created_at: '2026-01-04T00:00:00Z', confirmed_at: '2026-01-04T01:00:00Z' },
        { job_id: 'j2', amount_vnd: 200000, status: 'processing', created_at: '2026-01-05T00:00:00Z', confirmed_at: null },
        { job_id: 'orphan-job', amount_vnd: 999999, status: 'paid', created_at: '2026-01-06T00:00:00Z', confirmed_at: null },
      ],
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: 'c1', totalJobs: 2, completedJobs: 1, totalPaidVnd: 100000,
        latestJob: { id: 'j2', status: 'rendering', createdAt: Date.parse('2026-01-05T00:00:00Z') },
        lastActiveAt: Date.parse('2026-01-05T00:00:00Z'), lifecycleStatus: 'returning',
      }),
      expect.objectContaining({ id: 'c2', totalJobs: 0, totalPaidVnd: 0, lifecycleStatus: 'new' }),
    ]);
  });
});
