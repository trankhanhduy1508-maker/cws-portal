import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AffiliateService } from './affiliate.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { getOptionalCustomerId } from '../common/optional-auth.util';
import { SupabaseService } from '../supabase/supabase.service';

async function userId(req: Request, supabase: SupabaseService): Promise<string> {
  const id = await getOptionalCustomerId(req, supabase);
  if (!id) throw new UnauthorizedException('Cáº§n Ä‘Äƒng nháº­p');
  return id;
}

@Controller('affiliates')
export class AffiliateController {
  constructor(private readonly service: AffiliateService, private readonly supabase: SupabaseService) {}

  @Get('program') program() { return { commissionRate: 0.1, attributionWindowDays: 30, firstWithdrawalMinimumVnd: 50000, repeatWithdrawalMinimumVnd: 200000, payoutProvider: 'MANUAL_RECONCILIATION' }; }

  @Post('track') track(@Query('ref') ref: string) { return this.service.trackReferral(ref); }

  @Post('attach') @UseGuards(JwtAuthGuard) async attach(@Req() req: Request, @Body() body: { attributionToken: string }) { return this.service.attachReferral(await userId(req, this.supabase), body?.attributionToken); }

  @Post('me') @UseGuards(JwtAuthGuard) async register(@Req() req: Request) { return this.service.getOrCreateAccount(await userId(req, this.supabase)); }

  @Get('me/dashboard') @UseGuards(JwtAuthGuard) async dashboard(@Req() req: Request) { return this.service.dashboard(await userId(req, this.supabase)); }

  @Post('me/bank-account') @UseGuards(JwtAuthGuard) async bank(@Req() req: Request, @Body() body: { bankName: string; accountNumber: string; accountHolderName: string }) { return this.service.saveBankAccount(await userId(req, this.supabase), body); }

  @Post('me/withdrawals') @UseGuards(JwtAuthGuard) async withdrawal(@Req() req: Request, @Body() body: { amountVnd: number }) { return this.service.requestWithdrawal(await userId(req, this.supabase), Number(body?.amountVnd)); }

  @Post('me/feedback') @UseGuards(JwtAuthGuard) async feedback(@Req() req: Request, @Body() body: { subject: string; message: string; category?: string; contactEmail?: string }) { return this.service.createFeedback(await userId(req, this.supabase), body); }
}

@Controller('admin/affiliates')
@UseGuards(RoleGuard)
export class AffiliateAdminController {
  constructor(private readonly service: AffiliateService, private readonly supabase: SupabaseService) {}
  @Get() list() { return this.service.adminList(); }
  @Get('withdrawals') withdrawals() { return this.service.adminWithdrawals(); }
  @Get('commissions') commissions() { return this.service.adminCommissions(); }
  @Get('bank-accounts') bankAccounts() { return this.service.adminBankAccounts(); }
  @Post('withdrawals/:id/status') async withdrawalStatus(@Req() req: Request, @Param('id') id: string, @Body() body: { status: 'APPROVED' | 'AWAITING_TRANSFER' | 'PAID' | 'REJECTED'; providerTransactionId?: string; reason?: string }) { return this.service.adminSetWithdrawalStatus(await userId(req, this.supabase), id, body.status, body.providerTransactionId, body.reason); }
  @Post('commissions/:id/available') async available(@Req() req: Request, @Param('id') id: string) { return this.service.adminSetCommissionAvailable(await userId(req, this.supabase), id); }
}
