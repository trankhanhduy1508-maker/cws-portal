import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CUSTOMER_PROFILES_REPOSITORY,
  ICustomerProfilesRepository,
} from './repositories/customer-profiles.repository.interface';
import { CustomerProfile } from './domain/customer-profile';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMER_PROFILES_REPOSITORY)
    private readonly repository: ICustomerProfilesRepository,
  ) {}

  async getById(id: string): Promise<CustomerProfile> {
    const profile = await this.repository.findById(id);
    if (!profile) throw new NotFoundException(`Không tìm thấy customer ${id}`);
    return profile;
  }

  /** Admin xem "Danh sách khách hàng" (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7). */
  async listAll(): Promise<CustomerProfile[]> {
    return this.repository.findAll();
  }
}
