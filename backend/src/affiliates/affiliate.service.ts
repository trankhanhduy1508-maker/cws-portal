import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

const RATE_BPS = 1000;
const WINDOW_DAYS = 30;
const FIRST_MIN_VND = 50_000;
const REPEAT_MIN_VND = 200_000;

export function withdrawalMinimumVnd(paidWithdrawalCount: number): number {
  return paidWithdrawalCount === 0 ? FIRST_MIN_VND : REPEAT_MIN_VND;
}

export function commissionVnd(eligibleRevenueVnd: number, rateBps = RATE_BPS): number {
  return Math.floor(eligibleRevenueVnd * rateBps / 10000);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function maskAccount(value: string): string {
  return `${'*'.repeat(Math.max(value.length - 4, 2))}${value.slice(-4)}`;
}

@Injectable()
export class AffiliateService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private db() {
    return this.supabaseService.getClient();
  }

  async getOrCreateAccount(userId: string) {
    const existing = await this.db().from('affiliate_accounts').select('*').eq('user_id', userId).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return existing.data;
    for (let i = 0; i < 4; i += 1) {
      const code = randomBytes(6).toString('hex').toUpperCase();
      const { data, error } = await this.db().from('affiliate_accounts').insert({ user_id: userId, referral_code: code }).select().single();
      if (!error) {
        await this.db().from('affiliate_balances').insert({ affiliate_id: data.id }).throwOnError();
        await this.audit(userId, data.id, 'AFFILIATE_REGISTERED', 'affiliate_account', data.id, {});
        return data;
      }
      if (error.code !== '23505') throw new Error(error.message);
    }
    throw new ConflictException('KhÃ´ng táº¡o Ä‘Æ°á»£c referral code duy nháº¥t');
  }

  async trackReferral(referralCode: string) {
    const code = referralCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,16}$/.test(code)) throw new BadRequestException('Referral code khÃ´ng há»£p lá»‡');
    const { data: account, error } = await this.db().from('affiliate_accounts').select('id, referral_code, status').eq('referral_code', code).eq('status', 'ACTIVE').maybeSingle();
    if (error) throw new Error(error.message);
    if (!account) throw new NotFoundException('Referral code khÃ´ng tá»“n táº¡i hoáº·c Ä‘Ã£ bá»‹ khÃ³a');
    const token = randomUUID();
    const { error: insertError } = await this.db().from('affiliate_clicks').insert({
      referral_code: account.referral_code,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + WINDOW_DAYS * 86400000).toISOString(),
    });
    if (insertError) throw new Error(insertError.message);
    return { attributionToken: token, expiresAt: new Date(Date.now() + WINDOW_DAYS * 86400000).toISOString() };
  }

  async attachReferral(userId: string, token: string) {
    if (!token || token.length < 20) throw new BadRequestException('Attribution token khÃ´ng há»£p lá»‡');
    const { data: click, error } = await this.db().from('affiliate_clicks').select('id, referral_code, created_at, expires_at').eq('token_hash', hashToken(token)).maybeSingle();
    if (error) throw new Error(error.message);
    if (!click || new Date(click.expires_at).getTime() < Date.now()) throw new BadRequestException('Attribution token Ä‘Ã£ háº¿t háº¡n');
    const { data: account } = await this.db().from('affiliate_accounts').select('id, user_id, status').eq('referral_code', click.referral_code).eq('status', 'ACTIVE').maybeSingle();
    if (!account) throw new NotFoundException('Affiliate khÃ´ng cÃ²n hoáº¡t Ä‘á»™ng');
    if (account.user_id === userId) throw new ForbiddenException('KhÃ´ng thá»ƒ tá»± giá»›i thiá»‡u chÃ­nh mÃ¬nh');
    const { data: current } = await this.db().from('affiliate_attributions').select('id, attributed_at').eq('customer_id', userId).maybeSingle();
    if (current && new Date(current.attributed_at).getTime() >= new Date(click.created_at).getTime()) {
      return { attached: false, reason: 'already_attributed' };
    }
    const { data, error: upsertError } = await this.db().from('affiliate_attributions').upsert({
      affiliate_id: account.id,
      customer_id: userId,
      click_id: click.id,
      attributed_at: new Date().toISOString(),
      expires_at: click.expires_at,
    }, { onConflict: 'customer_id' }).select().single();
    if (upsertError) throw new Error(upsertError.message);
    await this.db().from('affiliate_clicks').update({ customer_id: userId, attached_at: new Date().toISOString() }).eq('id', click.id);
    await this.audit(userId, account.id, 'REFERRAL_ATTACHED', 'attribution', data.id, { clickId: click.id });
    return { attached: true };
  }

  async dashboard(userId: string) {
    const { data: account } = await this.db().from('affiliate_accounts').select('id, referral_code, status, joined_at').eq('user_id', userId).maybeSingle();
    if (!account) throw new NotFoundException('Báº¡n chÆ°a Ä‘Äƒng kÃ½ Affiliate');
    const [balance, commissions, withdrawals, clicks, conversions, bank] = await Promise.all([
      this.db().from('affiliate_balances').select('pending_vnd, available_vnd, paid_vnd').eq('affiliate_id', account.id).maybeSingle(),
      this.db().from('affiliate_commissions').select('id, eligible_revenue_vnd, commission_vnd, status, created_at, available_at, paid_at').eq('affiliate_id', account.id).order('created_at', { ascending: false }).limit(100),
      this.db().from('affiliate_withdrawals').select('id, amount_vnd, bank_name, masked_account, transfer_content, status, requested_at, approved_at, paid_at, rejection_reason').eq('affiliate_id', account.id).order('requested_at', { ascending: false }).limit(100),
      this.db().from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('referral_code', account.referral_code),
      this.db().from('affiliate_attributions').select('id', { count: 'exact', head: true }).eq('affiliate_id', account.id),
      this.db().from('affiliate_bank_accounts').select('bank_name, account_holder_name, account_number').eq('affiliate_id', account.id).maybeSingle(),
    ]);
    return {
      account: { ...account, referralLink: `/?ref=${account.referral_code}` },
      balance: balance.data ?? { pending_vnd: 0, available_vnd: 0, paid_vnd: 0 },
      clicks: clicks.count ?? 0,
      conversions: conversions.count ?? 0,
      commissions: commissions.data ?? [],
      withdrawals: withdrawals.data ?? [],
      bankAccount: bank.data ? { ...bank.data, account_number: maskAccount(bank.data.account_number) } : null,
    };
  }

  async saveBankAccount(userId: string, input: { bankName: string; accountNumber: string; accountHolderName: string }) {
    const account = await this.requireAccount(userId);
    if (!/^[0-9]{6,24}$/.test(input.accountNumber)) throw new BadRequestException('Sá»‘ tÃ i khoáº£n khÃ´ng há»£p lá»‡');
    const { data, error } = await this.db().from('affiliate_bank_accounts').upsert({
      affiliate_id: account.id,
      bank_name: input.bankName.trim(),
      account_number: input.accountNumber,
      account_holder_name: input.accountHolderName.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'affiliate_id' }).select('bank_name, account_holder_name, account_number').single();
    if (error) throw new Error(error.message);
    await this.audit(userId, account.id, 'BANK_ACCOUNT_UPDATED', 'bank_account', account.id, { bankName: input.bankName, accountSuffix: input.accountNumber.slice(-4) });
    return { ...data, account_number: maskAccount(data.account_number) };
  }

  async requestWithdrawal(userId: string, amountVnd: number) {
    const account = await this.requireAccount(userId);
    if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0) throw new BadRequestException('Sá»‘ tiá»n rÃºt khÃ´ng há»£p lá»‡');
    const { data, error } = await this.db().rpc('reserve_affiliate_withdrawal', {
      p_affiliate_id: account.id, p_amount_vnd: amountVnd, p_first_min_vnd: FIRST_MIN_VND, p_repeat_min_vnd: REPEAT_MIN_VND,
    });
    if (error) {
      const messages: Record<string, string> = {
        affiliate_balance_insufficient: 'Sá»‘ dÆ° Available khÃ´ng Ä‘á»§',
        affiliate_bank_account_missing: 'Vui lÃ²ng thÃªm thÃ´ng tin nháº­n tiá»n trÆ°á»›c',
        withdrawal_below_minimum: 'Sá»‘ tiá»n rÃºt chÆ°a Ä‘áº¡t má»©c tá»‘i thiá»ƒu',
      };
      const key = Object.keys(messages).find((x) => error.message.includes(x));
      throw new BadRequestException(key ? messages[key] : 'KhÃ´ng táº¡o Ä‘Æ°á»£c yÃªu cáº§u rÃºt tiá»n');
    }
    await this.audit(userId, account.id, 'WITHDRAWAL_REQUESTED', 'withdrawal', data.id, { amountVnd });
    return data;
  }

  async createFeedback(userId: string, input: { subject: string; message: string; category?: string; contactEmail?: string }) {
    const account = await this.requireAccount(userId);
    if (!input.subject?.trim() || !input.message?.trim()) throw new BadRequestException('Thiáº¿u tiÃªu Ä‘á» hoáº·c ná»™i dung gÃ³p Ã½');
    const { data, error } = await this.db().from('affiliate_feedback').insert({ affiliate_id: account.id, subject: input.subject.trim(), message: input.message.trim(), category: input.category?.trim() || 'OTHER', contact_email: input.contactEmail?.trim() || null }).select('id, subject, category, created_at').single();
    if (error) throw new Error(error.message);
    return data;
  }

  async recordCommissionForPayment(paymentId: string) {
    const { data: payment } = await this.db().from('payments').select('id, amount_vnd, status, job_id').eq('id', paymentId).maybeSingle();
    if (!payment || payment.status !== 'paid' || !payment.job_id) return null;
    const { data: job } = await this.db().from('render_orders').select('id, customer_id, final_price_vnd, status').eq('id', payment.job_id).maybeSingle();
    if (!job || job.status === 'cancelled' || job.status === 'error') return null;
    const { data: attribution } = await this.db().from('affiliate_attributions').select('id, affiliate_id, customer_id, expires_at').eq('customer_id', job.customer_id).maybeSingle();
    if (!attribution || attribution.customer_id !== job.customer_id || new Date(attribution.expires_at).getTime() < Date.now()) return null;
    const revenue = Number(job.final_price_vnd ?? payment.amount_vnd);
    if (!Number.isSafeInteger(revenue) || revenue <= 0) return null;
    const commission = commissionVnd(revenue, RATE_BPS);
    if (commission <= 0) return null;
    const { data, error } = await this.db().rpc('record_affiliate_commission', {
      p_affiliate_id: attribution.affiliate_id,
      p_attribution_id: attribution.id,
      p_customer_id: job.customer_id,
      p_payment_id: payment.id,
      p_eligible_revenue_vnd: revenue,
      p_rate_bps: RATE_BPS,
      p_commission_vnd: commission,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  async adminList() {
    const { data, error } = await this.db().from('affiliate_accounts').select('id, user_id, referral_code, status, joined_at, affiliate_balances(pending_vnd, available_vnd, paid_vnd)').order('joined_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async adminSetAffiliateStatus(actorUserId: string, id: string, status: 'ACTIVE' | 'SUSPENDED') {
    const { data: current, error: readError } = await this.db().from('affiliate_accounts').select('id, status').eq('id', id).maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y Affiliate');
    if (current.status === status) return current;
    const { data, error } = await this.db().from('affiliate_accounts').update({ status }).eq('id', id).select('id, status').single();
    if (error) throw new Error(error.message);
    await this.audit(actorUserId, id, `AFFILIATE_${status}`, 'affiliate_account', id, {});
    return data;
  }

  async adminWithdrawals() {
    const { data, error } = await this.db().from('affiliate_withdrawals').select('*').order('requested_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async adminCommissions() {
    const { data, error } = await this.db().from('affiliate_commissions').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async adminBankAccounts() {
    const { data, error } = await this.db().from('affiliate_bank_accounts').select('affiliate_id, bank_name, account_number, account_holder_name, updated_at').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async adminSetWithdrawalStatus(actorUserId: string, id: string, status: 'APPROVED' | 'AWAITING_TRANSFER' | 'PROCESSING' | 'UNKNOWN' | 'PAID' | 'REJECTED', providerTransactionId?: string, reason?: string) {
    const { data: current } = await this.db().from('affiliate_withdrawals').select('*').eq('id', id).maybeSingle();
    if (!current) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y withdrawal');
    if (current.status === status) {
      if (status === 'PAID') await this.db().rpc('finalize_affiliate_withdrawal', { p_withdrawal_id: id });
      if (status === 'REJECTED') await this.db().rpc('release_affiliate_withdrawal', { p_withdrawal_id: id });
      return current;
    }
    if (current.status === 'PAID') throw new BadRequestException('Withdrawal Ä‘Ã£ PAID, khÃ´ng thá»ƒ Ä‘á»•i tráº¡ng thÃ¡i');
    const allowed: Record<string, string[]> = {
      REQUESTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['AWAITING_TRANSFER', 'PROCESSING', 'UNKNOWN', 'REJECTED'],
      AWAITING_TRANSFER: ['PROCESSING', 'UNKNOWN', 'PAID', 'REJECTED'],
      PROCESSING: ['UNKNOWN', 'PAID', 'REJECTED'],
      UNKNOWN: ['PROCESSING', 'PAID', 'REJECTED'],
    };
    if (!allowed[current.status]?.includes(status)) {
      throw new BadRequestException(`KhÃ´ng thá»ƒ chuyá»ƒn withdrawal tá»« ${current.status} sang ${status}`);
    }
    if (status === 'PAID' && (!providerTransactionId || !providerTransactionId.trim())) throw new BadRequestException('PAID cáº§n provider transaction reference');
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString(), rejection_reason: reason ?? null };
    if (status === 'APPROVED') patch.approved_at = new Date().toISOString();
    if (status === 'PAID') patch.paid_at = new Date().toISOString();
    if (providerTransactionId) patch.provider_transaction_id = providerTransactionId.trim();
    const { data, error } = await this.db().from('affiliate_withdrawals').update(patch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    if (status === 'PAID') await this.db().rpc('finalize_affiliate_withdrawal', { p_withdrawal_id: id });
    if (status === 'REJECTED') await this.db().rpc('release_affiliate_withdrawal', { p_withdrawal_id: id });
    await this.audit(actorUserId, current.affiliate_id, `WITHDRAWAL_${status}`, 'withdrawal', id, { providerTransactionId: providerTransactionId ?? null });
    return data;
  }

  async adminSetCommissionAvailable(actorUserId: string, id: string) {
    const { data: commission } = await this.db().from('affiliate_commissions').select('*').eq('id', id).maybeSingle();
    if (!commission) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y commission');
    if (commission.status !== 'PENDING') return commission;
    const { data, error } = await this.db().rpc('make_affiliate_commission_available', { p_commission_id: id });
    if (error) throw new Error(error.message);
    await this.audit(actorUserId, commission.affiliate_id, 'COMMISSION_AVAILABLE', 'commission', id, {});
    return data;
  }

  private async requireAccount(userId: string) {
    const { data, error } = await this.db().from('affiliate_accounts').select('id, user_id, referral_code, status').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new NotFoundException('Báº¡n chÆ°a Ä‘Äƒng kÃ½ Affiliate');
    if (data.status !== 'ACTIVE') throw new ForbiddenException('TÃ i khoáº£n Affiliate Ä‘Ã£ bá»‹ táº¡m khÃ³a');
    return data;
  }

  private async audit(actorUserId: string, affiliateId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown>) {
    await this.db().from('affiliate_audit_logs').insert({ actor_user_id: actorUserId, affiliate_id: affiliateId, action, entity_type: entityType, entity_id: entityId, metadata });
  }
}
