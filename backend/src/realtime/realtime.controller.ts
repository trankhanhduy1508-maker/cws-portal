import {
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { getOptionalCustomerId } from '../common/optional-auth.util';
import { SupabaseService } from '../supabase/supabase.service';
import {
  IRenderOrdersRepository,
  RENDER_ORDERS_REPOSITORY,
} from '../jobs/repositories/render-orders.repository.interface';
import { Inject } from '@nestjs/common';
import { RealtimeAccessTicketService } from './realtime-access-ticket.service';

@Controller('jobs')
export class RealtimeController {
  constructor(
    @Inject(RENDER_ORDERS_REPOSITORY)
    private readonly ordersRepository: IRenderOrdersRepository,
    private readonly supabaseService: SupabaseService,
    private readonly ticketService: RealtimeAccessTicketService,
  ) {}

  @Post(':id/realtime-ticket')
  @UseGuards(JwtAuthGuard)
  async issue(@Param('id') id: string, @Req() req: Request) {
    const customerId = await getOptionalCustomerId(req, this.supabaseService);
    if (!customerId) throw new ForbiddenException('Cần đăng nhập để mở realtime');
    const order = await this.ordersRepository.findById(id);
    if (!order) throw new NotFoundException('Không tìm thấy job');
    if (!order.customerId || order.customerId !== customerId) {
      throw new ForbiddenException('Không có quyền mở realtime cho Job này');
    }
    return this.ticketService.issue(id, customerId);
  }
}
