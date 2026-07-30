import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CUSTOMER_PROFILES_REPOSITORY,
  ICustomerProfilesRepository,
} from './repositories/customer-profiles.repository.interface';
import { CustomerProfile, UpsertCustomerProfileInput } from './domain/customer-profile';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMER_PROFILES_REPOSITORY)
    private readonly repository: ICustomerProfilesRepository,
  ) {}

  /** Gọi sau khi Facebook OAuth xác thực xong — tạo mới hoặc cập nhật hồ sơ. */
  async loginWithFacebook(input: UpsertCustomerProfileInput): Promise<CustomerProfile> {
    return this.repository.upsertByFacebookId(input);
  }

  async getById(id: string): Promise<CustomerProfile> {
    const profile = await this.repository.findById(id);
    if (!profile) throw new NotFoundException(`Không tìm thấy customer ${id}`);
    return profile;
  }
}
