/**
 * id CHÍNH LÀ auth.users.id của Supabase Auth (migration 007) — không
 * còn là UUID tự sinh riêng. Được tạo/cập nhật tự động bởi Postgres
 * trigger `handle_new_auth_user()` mỗi khi khách đăng nhập Facebook
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
