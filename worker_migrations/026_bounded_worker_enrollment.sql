-- Architecture V1 bounded Worker enrollment.
-- Admin AAL2 creates short-lived, per-Worker tickets through Backend. A Worker
-- redeems exactly one ticket for exactly one stable Worker ID. Only hashes are
-- stored; neither the ticket nor the final Worker credential enters Postgres.
set lock_timeout = '5s';
set statement_timeout = '30s';

alter table public.workers
  add column if not exists hostname text;

create table if not exists public.worker_enrollment_tickets (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  expected_worker_id text not null check (expected_worker_id ~ '^[A-Za-z0-9._~-]{1,128}$'),
  fleet_id bigint not null references public.fleets(id),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_worker_id text,
  consumed_credential_hash text check (
    consumed_credential_hash is null or consumed_credential_hash ~ '^[0-9a-f]{64}$'
  ),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (
    (consumed_at is null and consumed_worker_id is null and consumed_credential_hash is null)
    or
    (consumed_at is not null and consumed_worker_id is not null and consumed_credential_hash is not null)
  )
);

create index if not exists idx_worker_enrollment_tickets_expiry
  on public.worker_enrollment_tickets(expires_at)
  where consumed_at is null;

alter table public.worker_enrollment_tickets enable row level security;
revoke all on public.worker_enrollment_tickets from public, anon, authenticated;
grant all on public.worker_enrollment_tickets to service_role;

create or replace function public.consume_worker_enrollment(
  p_token_hash text,
  p_worker_id text,
  p_credential_hash text,
  p_hostname text default null,
  p_gpu_name text default null,
  p_vram_mb integer default 0,
  p_expires_at timestamptz default (now() + interval '90 days')
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ticket public.worker_enrollment_tickets%rowtype;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$'
     or p_worker_id !~ '^[A-Za-z0-9._~-]{1,128}$'
     or p_credential_hash !~ '^[0-9a-f]{64}$'
     or p_vram_mb < 0
     or length(coalesce(p_hostname, '')) > 255
     or length(coalesce(p_gpu_name, '')) > 240
     or p_expires_at <= now()
     or p_expires_at > now() + interval '365 days' then
    return false;
  end if;

  select * into ticket
  from public.worker_enrollment_tickets
  where token_hash = p_token_hash
  for update;

  if not found or ticket.expected_worker_id <> p_worker_id then
    return false;
  end if;

  -- A lost HTTPS response can be retried safely with the same locally stored
  -- credential. Any different replay remains rejected.
  if ticket.consumed_at is not null then
    return ticket.consumed_worker_id = p_worker_id
      and ticket.consumed_credential_hash = p_credential_hash;
  end if;
  if ticket.expires_at <= now() then
    return false;
  end if;

  -- Serialize enrollment attempts for the same stable identity. An existing
  -- identity can only be changed by the separate authenticated rotation flow.
  perform pg_advisory_xact_lock(hashtextextended(p_worker_id, 0));
  if exists (
    select 1 from public.worker_identities where worker_id = p_worker_id
  ) then
    return false;
  end if;

  insert into public.workers (
    worker_id, fleet_id, hostname, gpu_name, vram_mb,
    status, observed_state, health_state, last_seen_at
  ) values (
    p_worker_id, ticket.fleet_id, nullif(p_hostname, ''),
    nullif(p_gpu_name, ''), p_vram_mb,
    'offline', 'INITIALIZING', 'UNKNOWN', now()
  )
  on conflict (worker_id) do update set
    fleet_id = excluded.fleet_id,
    hostname = excluded.hostname,
    gpu_name = excluded.gpu_name,
    vram_mb = excluded.vram_mb;

  -- Never let an enrollment ticket rotate or take over an existing identity.
  insert into public.worker_identities (
    worker_id, credential_hash, status, expires_at
  ) values (
    p_worker_id, p_credential_hash, 'active', p_expires_at
  ) on conflict (worker_id) do nothing;
  if not found then
    return false;
  end if;

  update public.worker_enrollment_tickets set
    consumed_at = now(),
    consumed_worker_id = p_worker_id,
    consumed_credential_hash = p_credential_hash
  where token_hash = p_token_hash;
  return true;
end;
$$;

revoke all on function public.consume_worker_enrollment(
  text,text,text,text,text,integer,timestamptz
) from public, anon, authenticated;
grant execute on function public.consume_worker_enrollment(
  text,text,text,text,text,integer,timestamptz
) to service_role;

comment on table public.worker_enrollment_tickets is
  'Short-lived, one-time, per-Worker enrollment tickets. Backend service-role only.';
