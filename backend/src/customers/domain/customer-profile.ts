/**
 * id CHÍNH LÀ auth.users.id của Supabase Auth (migration 007) — không
 * còn là UUID tự sinh riêng. Được tạo/cập nhật tự động bởi Postgres
 * trigger `handle_new_auth_user()` mỗi khi khách đăng nhập Google
 * qua Supabase Auth, Backend không tự tay tạo/sửa hồ sơ này.
 */
export interface CustomerProfile {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  phone: string | null;
  preferredContact: string | null;
  marketingConsent: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerCrmSummary {
  id: string;
  email: string | null;
  fullName: string | null;
  registeredAt: number;
  lastActiveAt: number;
  totalJobs: number;
  completedJobs: number;
  totalPaidVnd: number;
  latestJob: {
    id: string;
    status: string;
    createdAt: number;
  } | null;
  lifecycleStatus: 'new' | 'rendered' | 'returning';
}
