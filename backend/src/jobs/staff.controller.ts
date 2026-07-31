import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RoleGuard, Roles } from '../common/guards/role.guard';

/** Frontend gọi ngay sau khi nhân sự đăng nhập (Supabase email/password)
 * để biết điều hướng #admin hay #host — KHÔNG tự suy ra role ở Frontend
 * (route guard thật nằm ở RoleGuard, đây chỉ là tiện ích đọc lại role
 * của chính request đang gọi). */
@Controller('staff')
export class StaffController {
  @Get('me')
  @UseGuards(RoleGuard)
  @Roles('admin', 'host')
  async me(@Req() req: Request) {
    return { userId: req.staff!.userId, role: req.staff!.role };
  }
}
