import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { parseOperationsQuery } from './operations-query';
import { OperationsService } from './operations.service';

@Controller('operations')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('overview')
  overview() { return this.operations.overview(); }

  @Get('orders')
  list(@Query() query: Record<string, string | undefined>) {
    return this.operations.list(parseOperationsQuery(query));
  }

  @Get('orders/:id')
  detail(@Param('id') id: string) { return this.operations.detail(id); }

  @Get('orders/:id/timeline')
  timeline(@Param('id') id: string) { return this.operations.timeline(id); }
}
