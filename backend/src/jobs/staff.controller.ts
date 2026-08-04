import { BadRequestException, Controller, Get, NotFoundException, Param, Patch, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RoleGuard, Roles } from '../common/guards/role.guard';
import { StorageService } from '../storage/storage.service';
import { EditRequestStatus } from '../storage/domain/edit-request';

/** Frontend gọi ngay sau khi nhân sự đăng nhập (Supabase email/password)
 * để biết điều hướng #admin hay #host — KHÔNG tự suy ra role ở Frontend
 * (route guard thật nằm ở RoleGuard, đây chỉ là tiện ích đọc lại role
 * của chính request đang gọi). */
@Controller('staff')
export class StaffController {
  constructor(private readonly storageService: StorageService) {}

  @Get('edit-requests')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async editRequests() {
    return { requests: await this.storageService.listAllEditRequests() };
  }

  @Patch('edit-requests/:id')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async updateEditRequest(
    @Param('id') id: string,
    @Body() body: { status?: string; assignedTo?: string | null; expectedResponseAt?: number | null },
    @Req() req: Request,
  ) {
    const allowed: EditRequestStatus[] = ['REQUESTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DECLINED'];
    if (!body?.status || !allowed.includes(body.status as EditRequestStatus)) {
      throw new BadRequestException('Trạng thái yêu cầu chỉnh sửa không hợp lệ');
    }
    const updated = await this.storageService.updateEditRequestStatus({
      id,
      status: body.status as EditRequestStatus,
      assignedTo: body.assignedTo ?? req.staff?.userId ?? null,
      expectedResponseAt: body.expectedResponseAt ?? null,
    });
    if (!updated) throw new NotFoundException('Không tìm thấy yêu cầu chỉnh sửa');
    return updated;
  }

  @Get('me')
  @UseGuards(RoleGuard)
  @Roles('admin', 'host')
  async me(@Req() req: Request) {
    return { userId: req.staff!.userId, role: req.staff!.role };
  }
}
