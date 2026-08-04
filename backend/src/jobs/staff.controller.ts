import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Body, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RoleGuard, Roles } from '../common/guards/role.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { getOptionalCustomerId } from '../common/optional-auth.util';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageService } from '../storage/storage.service';
import { EditRequestStatus } from '../storage/domain/edit-request';

/** Frontend gá»i ngay sau khi nhÃ¢n sá»± Ä‘Äƒng nháº­p (Supabase email/password)
 * Ä‘á»ƒ biáº¿t Ä‘iá»u hÆ°á»›ng #admin hay #host â€” KHÃ”NG tá»± suy ra role á»Ÿ Frontend
 * (route guard tháº­t náº±m á»Ÿ RoleGuard, Ä‘Ã¢y chá»‰ lÃ  tiá»‡n Ã­ch Ä‘á»c láº¡i role
 * cá»§a chÃ­nh request Ä‘ang gá»i). */
@Controller('staff')
export class StaffController {
  constructor(private readonly storageService: StorageService, private readonly supabase: SupabaseService) {}

  @Get('access')
  @UseGuards(JwtAuthGuard)
  async access(@Req() req: Request) {
    const userId = await getOptionalCustomerId(req, this.supabase);
    if (!userId) throw new UnauthorizedException('Thiáº¿u phiÃªn Supabase há»£p lá»‡');
    const { data, error } = await this.supabase.getClient().from('staff_roles').select('role').eq('user_id', userId).maybeSingle();
    if (error || !data) throw new ForbiddenException('TÃ i khoáº£n chÆ°a Ä‘Æ°á»£c cáº¥p quyá»n Admin/Host');
    return { userId, role: data.role };
  }

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
      throw new BadRequestException('Tráº¡ng thÃ¡i yÃªu cáº§u chá»‰nh sá»­a khÃ´ng há»£p lá»‡');
    }
    const updated = await this.storageService.updateEditRequestStatus({
      id,
      status: body.status as EditRequestStatus,
      assignedTo: body.assignedTo ?? req.staff?.userId ?? null,
      expectedResponseAt: body.expectedResponseAt ?? null,
    });
    if (!updated) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u chá»‰nh sá»­a');
    return updated;
  }

  @Get('me')
  @UseGuards(RoleGuard)
  @Roles('admin', 'host')
  async me(@Req() req: Request) {
    return { userId: req.staff!.userId, role: req.staff!.role };
  }
}
