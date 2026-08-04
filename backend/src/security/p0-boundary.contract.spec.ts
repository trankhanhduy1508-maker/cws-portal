import { readFileSync } from 'fs';
import { resolve } from 'path';

function source(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

describe('P0 authorization boundary contracts', () => {
  it('customer job mutations require a verified JWT and service ownership checks', () => {
    const controller = source('../jobs/jobs.controller.ts');
    const service = source('../jobs/jobs.service.ts');
    expect(controller).toContain("@UseGuards(JwtAuthGuard)");
    expect(controller).toContain("@Post(':id/request-changes')");
    expect(service).toContain('this.assertOwnership(order, customerId, isAdmin);');
    expect(service).toContain('if (!customerId || !order.customerId || order.customerId !== customerId)');
  });

  it('customer edit requests are persisted with owner identity and RLS', () => {
    const migration = source('../../migrations/017_create_edit_requests.sql');
    const storage = source('../storage/storage.service.ts');
    expect(migration).toContain('ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;');
    expect(migration).toContain('USING (auth.uid() = requested_by)');
    expect(storage).toContain('findByJobId(jobId)');
  });

  it('admin edit request operations require backend MFA/RBAC guard', () => {
    const staff = source('../jobs/staff.controller.ts');
    expect(staff).toContain("@UseGuards(RoleGuard)");
    expect(staff).toContain("@Roles('admin')");
    expect(staff).toContain("@Patch('edit-requests/:id')");
  });

  it('worker logs remain admin-only and are not exposed to customer route', () => {
    const controller = source('../jobs/jobs.controller.ts');
    const start = controller.indexOf("@Get(':id/logs')");
    const end = controller.indexOf("@Get(':id/notifications')");
    const block = controller.slice(start, end);
    expect(block).toContain("@Roles('admin')");
    expect(block).toContain('@UseGuards(RoleGuard)');
  });
});
