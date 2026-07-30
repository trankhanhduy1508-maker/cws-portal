import { Controller, Get, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { AdminKeyGuard } from '../common/guards/admin-key.guard';

/** "Danh sách khách hàng" (CWS_ROADMAP_MVP_V1.md, Giai đoạn 7) — CHỈ
 * admin xem được (toàn bộ khách hàng), không phải route công khai. */
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @UseGuards(AdminKeyGuard)
  async listAll() {
    return this.customersService.listAll();
  }
}
