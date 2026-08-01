import { CustomerProfile } from '../domain/customer-profile';

export const CUSTOMER_PROFILES_REPOSITORY = Symbol('CUSTOMER_PROFILES_REPOSITORY');

/**
 * Việc tạo/cập nhật customer_profiles khi có Google Login mới KHÔNG
 * còn do Backend làm nữa — Postgres trigger `handle_new_auth_user()`
 * (migration 007) tự làm việc đó ngay khi Supabase Auth tạo user mới.
 * Repository này giờ chỉ dùng để ĐỌC.
 */
export interface ICustomerProfilesRepository {
  findById(id: string): Promise<CustomerProfile | null>;
  /** Admin xem "Danh sách khách hàng" (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  findAll(): Promise<CustomerProfile[]>;
}
