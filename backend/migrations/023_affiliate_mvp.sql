-- Affiliate MVP: server-side attribution, idempotent commission ledger,
-- reserved withdrawals and manual payout reconciliation.

create extension if not exists pgcrypto;

create table if not exists public.affiliate_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9]{6,16}$'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null references public.affiliate_accounts(referral_code),
  token_hash text not null unique,
  customer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attached_at timestamptz
);

create index if not exists idx_affiliate_clicks_customer on public.affiliate_clicks(customer_id, created_at desc);

create table if not exists public.affiliate_attributions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_accounts(id),
  customer_id uuid not null unique references auth.users(id) on delete cascade,
  click_id uuid not null references public.affiliate_clicks(id),
  attributed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_attr_affiliate on public.affiliate_attributions(affiliate_id);

create table if not exists public.affiliate_balances (
  affiliate_id uuid primary key references public.affiliate_accounts(id) on delete cascade,
  pending_vnd bigint not null default 0 check (pending_vnd >= 0),
  available_vnd bigint not null default 0 check (available_vnd >= 0),
  paid_vnd bigint not null default 0 check (paid_vnd >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_accounts(id),
  attribution_id uuid not null references public.affiliate_attributions(id),
  customer_id uuid not null references auth.users(id),
  payment_id uuid not null unique references public.payments(id),
  eligible_revenue_vnd bigint not null check (eligible_revenue_vnd > 0),
  rate_bps integer not null check (rate_bps between 0 and 10000),
  commission_vnd bigint not null check (commission_vnd > 0),
  status text not null default 'PENDING' check (status in ('PENDING','AVAILABLE','WITHDRAWAL_PENDING','PAID','REVERSED','REJECTED')),
  reversal_reason text,
  created_at timestamptz not null default now(),
  available_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_affiliate_commissions_affiliate on public.affiliate_commissions(affiliate_id, created_at desc);

create table if not exists public.affiliate_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null unique references public.affiliate_accounts(id) on delete cascade,
  bank_name text not null check (char_length(bank_name) between 2 and 120),
  account_number text not null check (account_number ~ '^[0-9]{6,24}$'),
  account_holder_name text not null check (char_length(account_holder_name) between 2 and 160),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_withdrawals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_accounts(id),
  amount_vnd bigint not null check (amount_vnd > 0),
  bank_name text not null,
  masked_account text not null,
  transfer_content text not null unique,
  status text not null default 'REQUESTED' check (status in ('REQUESTED','APPROVED','AWAITING_TRANSFER','PROCESSING','UNKNOWN','PAID','REJECTED','CANCELLED')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  balance_finalized_at timestamptz,
  balance_released_at timestamptz,
  provider_transaction_id text,
  rejection_reason text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_affiliate_withdrawals_affiliate on public.affiliate_withdrawals(affiliate_id, requested_at desc);

alter table public.affiliate_withdrawals add column if not exists balance_finalized_at timestamptz;
alter table public.affiliate_withdrawals add column if not exists balance_released_at timestamptz;

create table if not exists public.affiliate_feedback (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliate_accounts(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 1 and 4000),
  category text not null default 'OTHER',
  contact_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  affiliate_id uuid references public.affiliate_accounts(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.affiliate_accounts enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_attributions enable row level security;
alter table public.affiliate_balances enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_bank_accounts enable row level security;
alter table public.affiliate_withdrawals enable row level security;
alter table public.affiliate_feedback enable row level security;
alter table public.affiliate_audit_logs enable row level security;
-- No direct client policies. Only the trusted Backend service role may access these tables.

create or replace function public.reserve_affiliate_withdrawal(
  p_affiliate_id uuid,
  p_amount_vnd bigint,
  p_first_min_vnd bigint default 50000,
  p_repeat_min_vnd bigint default 200000
)
returns public.affiliate_withdrawals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_balance public.affiliate_balances;
  v_bank public.affiliate_bank_accounts;
  v_paid_count integer;
  v_min bigint;
  v_row public.affiliate_withdrawals;
  v_code text;
begin
  if p_amount_vnd <= 0 then raise exception 'withdrawal_amount_invalid'; end if;
  select * into v_balance from public.affiliate_balances where affiliate_id = p_affiliate_id for update;
  if not found then raise exception 'affiliate_balance_not_found'; end if;
  if v_balance.available_vnd < p_amount_vnd then raise exception 'affiliate_balance_insufficient'; end if;
  select count(*) into v_paid_count from public.affiliate_withdrawals where affiliate_id = p_affiliate_id and status = 'PAID';
  v_min := case when v_paid_count = 0 then p_first_min_vnd else p_repeat_min_vnd end;
  if p_amount_vnd < v_min then raise exception 'withdrawal_below_minimum:%', v_min; end if;
  select * into v_bank from public.affiliate_bank_accounts where affiliate_id = p_affiliate_id;
  if not found then raise exception 'affiliate_bank_account_missing'; end if;
  v_code := 'CWS AFF ' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  update public.affiliate_balances
    set available_vnd = available_vnd - p_amount_vnd,
        updated_at = now()
    where affiliate_id = p_affiliate_id;
  insert into public.affiliate_withdrawals(affiliate_id, amount_vnd, bank_name, masked_account, transfer_content)
  values (p_affiliate_id, p_amount_vnd, v_bank.bank_name,
          repeat('*', greatest(char_length(v_bank.account_number)-4, 2)) || right(v_bank.account_number, 4), v_code)
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.reserve_affiliate_withdrawal(uuid, bigint, bigint, bigint) from public, anon, authenticated;
grant execute on function public.reserve_affiliate_withdrawal(uuid, bigint, bigint, bigint) to service_role;

create or replace function public.record_affiliate_commission(
  p_affiliate_id uuid,
  p_attribution_id uuid,
  p_customer_id uuid,
  p_payment_id uuid,
  p_eligible_revenue_vnd bigint,
  p_rate_bps integer,
  p_commission_vnd bigint
)
returns public.affiliate_commissions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.affiliate_commissions;
begin
  insert into public.affiliate_commissions(
    affiliate_id, attribution_id, customer_id, payment_id,
    eligible_revenue_vnd, rate_bps, commission_vnd, status
  ) values (
    p_affiliate_id, p_attribution_id, p_customer_id, p_payment_id,
    p_eligible_revenue_vnd, p_rate_bps, p_commission_vnd, 'PENDING'
  ) on conflict (payment_id) do nothing returning * into v_row;
  if not found then
    select * into v_row from public.affiliate_commissions where payment_id = p_payment_id;
    return v_row;
  end if;
  insert into public.affiliate_balances(affiliate_id, pending_vnd)
    values (p_affiliate_id, p_commission_vnd)
    on conflict (affiliate_id) do update set pending_vnd = public.affiliate_balances.pending_vnd + excluded.pending_vnd,
      updated_at = now();
  return v_row;
end;
$$;

revoke all on function public.record_affiliate_commission(uuid, uuid, uuid, uuid, bigint, integer, bigint) from public, anon, authenticated;
grant execute on function public.record_affiliate_commission(uuid, uuid, uuid, uuid, bigint, integer, bigint) to service_role;

create or replace function public.make_affiliate_commission_available(p_commission_id uuid)
returns public.affiliate_commissions
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_row public.affiliate_commissions;
begin
  update public.affiliate_commissions
    set status = 'AVAILABLE', available_at = now(), updated_at = now()
    where id = p_commission_id and status = 'PENDING'
    returning * into v_row;
  if v_row.id is not null then
    update public.affiliate_balances
      set pending_vnd = pending_vnd - v_row.commission_vnd,
          available_vnd = available_vnd + v_row.commission_vnd,
          updated_at = now()
      where affiliate_id = v_row.affiliate_id;
  else
    select * into v_row from public.affiliate_commissions where id = p_commission_id;
  end if;
  return v_row;
end;
$$;

create or replace function public.finalize_affiliate_withdrawal(p_withdrawal_id uuid)
returns public.affiliate_withdrawals
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_row public.affiliate_withdrawals;
begin
  select * into v_row from public.affiliate_withdrawals where id = p_withdrawal_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  if v_row.status <> 'PAID' then raise exception 'withdrawal_not_paid'; end if;
  if v_row.balance_finalized_at is null then
    update public.affiliate_balances set paid_vnd = paid_vnd + v_row.amount_vnd, updated_at = now()
      where affiliate_id = v_row.affiliate_id;
    update public.affiliate_withdrawals set balance_finalized_at = now(), updated_at = now()
      where id = p_withdrawal_id;
  end if;
  return v_row;
end;
$$;

create or replace function public.release_affiliate_withdrawal(p_withdrawal_id uuid)
returns public.affiliate_withdrawals
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_row public.affiliate_withdrawals;
begin
  select * into v_row from public.affiliate_withdrawals where id = p_withdrawal_id for update;
  if not found then raise exception 'withdrawal_not_found'; end if;
  if v_row.status <> 'REJECTED' then raise exception 'withdrawal_not_rejected'; end if;
  if v_row.balance_released_at is null then
    update public.affiliate_balances set available_vnd = available_vnd + v_row.amount_vnd, updated_at = now()
      where affiliate_id = v_row.affiliate_id;
    update public.affiliate_withdrawals set balance_released_at = now(), updated_at = now()
      where id = p_withdrawal_id;
  end if;
  return v_row;
end;
$$;

revoke all on function public.make_affiliate_commission_available(uuid) from public, anon, authenticated;
grant execute on function public.make_affiliate_commission_available(uuid) to service_role;
revoke all on function public.finalize_affiliate_withdrawal(uuid) from public, anon, authenticated;
grant execute on function public.finalize_affiliate_withdrawal(uuid) to service_role;
revoke all on function public.release_affiliate_withdrawal(uuid) from public, anon, authenticated;
grant execute on function public.release_affiliate_withdrawal(uuid) to service_role;
