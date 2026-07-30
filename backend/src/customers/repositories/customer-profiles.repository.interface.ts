import { CustomerProfile, UpsertCustomerProfileInput } from '../domain/customer-profile';

export const CUSTOMER_PROFILES_REPOSITORY = Symbol('CUSTOMER_PROFILES_REPOSITORY');

export interface ICustomerProfilesRepository {
  findByFacebookId(facebookId: string): Promise<CustomerProfile | null>;
  findById(id: string): Promise<CustomerProfile | null>;
  /** Tạo mới nếu chưa có facebook_id, hoặc cập nhật thông tin mới nhất từ Facebook nếu đã có. */
  upsertByFacebookId(input: UpsertCustomerProfileInput): Promise<CustomerProfile>;
}
