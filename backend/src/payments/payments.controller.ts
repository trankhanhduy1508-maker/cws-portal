import {
  Body, Controller, Get, Headers, HttpCode, Param, Post, Req, UseGuards,
} from '@nestjs/common';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { AuthenticatedRequest, JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  AdminPaymentDecisionDto, AdminPaymentNoteDto, CreatePaymentDto, SubmitPaymentEvidenceDto,
} from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() dto: CreatePaymentDto, @Req() req: AuthenticatedRequest) {
    return this.paymentsService.createIntent(dto, req.user.userId);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.paymentsService.get(id, req.user);
  }

  @Post(':id/evidence')
  @HttpCode(200)
  async submitEvidence(
    @Param('id') id: string,
    @Body() dto: SubmitPaymentEvidenceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.submitEvidence(id, req.user.userId, dto.claimedAmountVnd);
  }

  @Post(':id/confirm')
  @UseGuards(AdminRoleGuard)
  @HttpCode(200)
  async confirm(
    @Param('id') id: string,
    @Body() dto: AdminPaymentDecisionDto,
    @Headers('idempotency-key') key: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.confirm(id, req.user.userId, dto.receivedAmountVnd, dto.note, key);
  }

  @Post(':id/reject')
  @UseGuards(AdminRoleGuard)
  @HttpCode(200)
  async reject(
    @Param('id') id: string,
    @Body() dto: AdminPaymentNoteDto,
    @Headers('idempotency-key') key: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.reject(id, req.user.userId, dto.note, key);
  }

  @Post(':id/refund')
  @UseGuards(AdminRoleGuard)
  @HttpCode(200)
  async refund(
    @Param('id') id: string,
    @Body() dto: AdminPaymentNoteDto,
    @Headers('idempotency-key') key: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.refund(id, req.user.userId, dto.note, key);
  }
}
