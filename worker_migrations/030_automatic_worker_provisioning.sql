-- Spec 009: automatic site-scoped first provisioning.
-- Additive only. Existing workers, identities and historical tickets are preserved.
set lock_timeout = '5s';
set statement_timeout = '30s';

create table if not exists public.worker_site_bootstrap_capabilities (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  fleet_id bigint not null references public.fleets(id),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  quota integer not null check (quota > 0),
  used_count integer not null default 0 check (used_count >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.worker_provisioning_bindings (
  bootstrap_hash text not null references public.worker_site_bootstrap_capabilities(token_hash),
  fingerprint_hash text not null check (fingerprint_hash ~ '^[a-f0-9]{64}$'),
  worker_id text not null primary key references public.workers(worker_id),
  fleet_id bigint not null references public.fleets(id),
  created_at timestamptz not null default now(),
  unique (bootstrap_hash, fingerprint_hash)
);

alter table public.worker_enrollment_tickets
  add column if not exists fingerprint_hash text
  check (fingerprint_hash is null or fingerprint_hash ~ '^[a-f0-9]{64}$');

alter table public.worker_site_bootstrap_capabilities enable row level security;
alter table public.worker_provisioning_bindings enable row level security;
revoke all on public.worker_site_bootstrap_capabilities from public, anon, authenticated;
revoke all on public.worker_provisioning_bindings from public, anon, authenticated;
grant all on public.worker_site_bootstrap_capabilities, public.worker_provisioning_bindings to service_role;

create or replace function public.provision_worker(
  p_bootstrap_hash text,
  p_fingerprint_hash text,
  p_worker_id text,
  p_ticket_hash text,
  p_hostname text default null,
  p_gpu_name text default null,
  p_vram_mb integer default 0,
  p_ticket_expires_at timestamptz default (now() + interval '30 minutes')
) returns table(worker_id text, ticket_hash text)
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  capability public.worker_site_bootstrap_capabilities%rowtype;
  binding public.worker_provisioning_bindings%rowtype;
begin
  if p_bootstrap_hash !~ '^[0-9a-f]{64}$'
     or p_fingerprint_hash !~ '^[a-f0-9]{64}$'
     or p_worker_id !~ '^cwsw_[a-f0-9]{32}$'
     or p_ticket_hash !~ '^[0-9a-f]{64}$'
     or p_vram_mb < 0
     or length(coalesce(p_hostname, '')) > 255
     or length(coalesce(p_gpu_name, '')) > 240
     or p_ticket_expires_at <= now()
     or p_ticket_expires_at > now() + interval '1 hour' then
    return;
  end if;

  select * into capability from public.worker_site_bootstrap_capabilities
  where token_hash = p_bootstrap_hash for update;
  if not found or capability.revoked_at is not null or capability.expires_at <= now()
     or capability.used_count >= capability.quota then return; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_bootstrap_hash || ':' || p_fingerprint_hash, 0));
  select * into binding from public.worker_provisioning_bindings
  where bootstrap_hash = p_bootstrap_hash and fingerprint_hash = p_fingerprint_hash;

  if not found then
    insert into public.workers(worker_id, fleet_id, hostname, gpu_name, vram_mb, status,
      observed_state, health_state, last_seen_at)
    values (p_worker_id, capability.fleet_id, nullif(p_hostname, ''), nullif(p_gpu_name, ''),
      p_vram_mb, 'offline', 'INITIALIZING', 'UNKNOWN', now());

    insert into public.worker_provisioning_bindings(bootstrap_hash, fingerprint_hash, worker_id, fleet_id)
    values (p_bootstrap_hash, p_fingerprint_hash, p_worker_id, capability.fleet_id)
    returning * into binding;
    update public.worker_site_bootstrap_capabilities
    set used_count = used_count + 1 where token_hash = p_bootstrap_hash;
  end if;

  insert into public.worker_enrollment_tickets(
    token_hash, expected_worker_id, fleet_id, fingerprint_hash, expires_at)
  values (p_ticket_hash, binding.worker_id, binding.fleet_id, p_fingerprint_hash, p_ticket_expires_at);
  return query select binding.worker_id, p_ticket_hash;
end;
$$;

revoke all on function public.provision_worker(text,text,text,text,text,text,integer,timestamptz)
  from public, anon, authenticated;
grant execute on function public.provision_worker(text,text,text,text,text,text,integer,timestamptz)
  to service_role;

-- New fingerprint-bound redemption overload. The historical seven-argument
-- function is retained for existing records and recovery compatibility.
create or replace function public.consume_worker_enrollment(
  p_token_hash text,
  p_worker_id text,
  p_credential_hash text,
  p_hostname text,
  p_gpu_name text,
  p_vram_mb integer,
  p_expires_at timestamptz,
  p_fingerprint_hash text
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare ticket public.worker_enrollment_tickets%rowtype;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_worker_id !~ '^cwsw_[a-f0-9]{32}$'
     or p_credential_hash !~ '^[0-9a-f]{64}$' or p_fingerprint_hash !~ '^[a-f0-9]{64}$'
     or p_vram_mb < 0 or p_expires_at <= now() or p_expires_at > now() + interval '365 days' then return false; end if;
  select * into ticket from public.worker_enrollment_tickets where token_hash = p_token_hash for update;
  if not found or ticket.expected_worker_id <> p_worker_id or ticket.fingerprint_hash <> p_fingerprint_hash then return false; end if;
  if ticket.consumed_at is not null then
    return ticket.consumed_worker_id = p_worker_id and ticket.consumed_credential_hash = p_credential_hash;
  end if;
  if ticket.expires_at <= now() then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_worker_id, 0));
  if exists (select 1 from public.worker_identities where worker_id = p_worker_id) then return false; end if;
  insert into public.worker_identities(worker_id, credential_hash, status, expires_at)
    values (p_worker_id, p_credential_hash, 'active', p_expires_at);
  update public.worker_enrollment_tickets set consumed_at = now(), consumed_worker_id = p_worker_id,
    consumed_credential_hash = p_credential_hash where token_hash = p_token_hash;
  return true;
end;
$$;

revoke all on function public.consume_worker_enrollment(text,text,text,text,text,integer,timestamptz,text)
  from public, anon, authenticated;
grant execute on function public.consume_worker_enrollment(text,text,text,text,text,integer,timestamptz,text)
  to service_role;

-- Harden the legacy recovery overload as well: a collision is rejected, never
-- converted into an update of an existing Worker row.
create or replace function public.consume_worker_enrollment(
  p_token_hash text, p_worker_id text, p_credential_hash text,
  p_hostname text default null, p_gpu_name text default null,
  p_vram_mb integer default 0,
  p_expires_at timestamptz default (now() + interval '90 days')
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare ticket public.worker_enrollment_tickets%rowtype;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_worker_id !~ '^cwsw_[a-f0-9]{32}$'
     or p_credential_hash !~ '^[0-9a-f]{64}$' or p_vram_mb < 0
     or p_expires_at <= now() or p_expires_at > now() + interval '365 days' then return false; end if;
  select * into ticket from public.worker_enrollment_tickets where token_hash = p_token_hash for update;
  if not found or ticket.expected_worker_id <> p_worker_id or ticket.expires_at <= now() then return false; end if;
  if ticket.consumed_at is not null then
    return ticket.consumed_worker_id = p_worker_id and ticket.consumed_credential_hash = p_credential_hash;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_worker_id, 0));
  if exists (select 1 from public.worker_identities where worker_id = p_worker_id) then return false; end if;
  insert into public.workers(worker_id, fleet_id, hostname, gpu_name, vram_mb, status,
    observed_state, health_state, last_seen_at)
    values (p_worker_id, ticket.fleet_id, nullif(p_hostname, ''), nullif(p_gpu_name, ''),
      p_vram_mb, 'offline', 'INITIALIZING', 'UNKNOWN', now()) on conflict (worker_id) do nothing;
  if not found then return false; end if;
  insert into public.worker_identities(worker_id, credential_hash, status, expires_at)
    values (p_worker_id, p_credential_hash, 'active', p_expires_at);
  update public.worker_enrollment_tickets set consumed_at = now(), consumed_worker_id = p_worker_id,
    consumed_credential_hash = p_credential_hash where token_hash = p_token_hash;
  return true;
end;
$$;
