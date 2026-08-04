import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleGuard, Roles } from '../common/guards/role.guard';
import { getOptionalCustomerId } from '../common/optional-auth.util';
import { SupabaseService } from '../supabase/supabase.service';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async customerId(req: Request): Promise<string> {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    if (!customerId) throw new UnauthorizedException('Support cần đăng nhập Google');
    return customerId;
  }

  @Post('tickets')
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: { jobId?: string | null; subject?: string; message?: string },
    @Req() req: Request,
  ) {
    return this.supportService.create({
      customerId: await this.customerId(req),
      jobId: body?.jobId,
      subject: body?.subject ?? '',
      message: body?.message ?? '',
    });
  }

  @Get('tickets')
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: Request) {
    return { tickets: await this.supportService.listForCustomer(await this.customerId(req)) };
  }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard)
  async get(@Param('id') id: string, @Req() req: Request) {
    return this.supportService.getForCustomer(id, await this.customerId(req));
  }

  @Get('admin/tickets')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async adminList() {
    return { tickets: await this.supportService.listForAdmin() };
  }

  @Patch('admin/tickets/:id')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async adminUpdate(
    @Param('id') id: string,
    @Body() body: { status?: string; expectedResponseAt?: number | null },
    @Req() req: Request,
  ) {
    return this.supportService.updateForAdmin({
      id,
      status: body?.status ?? '',
      assignedTo: req.staff?.userId ?? null,
      expectedResponseAt: body?.expectedResponseAt ?? null,
    });
  }
}
