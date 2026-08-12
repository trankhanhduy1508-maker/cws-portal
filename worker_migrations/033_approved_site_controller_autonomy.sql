-- Spec 009 follow-up: durable approved-site controller autonomy.
-- Additive only. Founder/Admin approval creates trust once; the controller can
-- renew bounded provisioning capabilities without repeating Admin AAL2.
set lock_timeout = '5s';
set statement_timeout = '30s';

create table if not exists public.worker_site_controller_trust (
  controller_hash text primary key check (controller_hash ~ '^[0-9a-f]{64}$'),
  fleet_id bigint not null references public.fleets(id),
  status text not null default 'approved'
    check (status in ('approved', 'suspended', 'revoked')),
  quota integer not null check (quota > 0 and quota <= 1000000),
  capability_ttl_minutes integer not null default 30
    check (capability_ttl_minutes between 5 and 60),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz not null default now(),
  suspended_at timestamptz,
  revoked_at timestamptz,
  last_capability_issued_at timestamptz,
  status_changed_by uuid references auth.users(id),
  status_changed_at timestamptz
);

alter table public.worker_site_bootstrap_capabilities
  add column if not exists issued_by_controller_hash text
  references public.worker_site_controller_trust(controller_hash);

alter table public.worker_site_controller_trust enable row level security;
revoke all on public.worker_site_controller_trust from public, anon, authenticated;
grant all on public.worker_site_controller_trust to service_role;

create index if not exists idx_worker_site_controller_trust_fleet_status
  on public.worker_site_controller_trust(fleet_id, status);

create unique index if not exists uq_worker_provisioning_fleet_fingerprint
  on public.worker_provisioning_bindings(fleet_id, fingerprint_hash);

create or replace function public.issue_site_bootstrap_capability(
  p_controller_hash text,
  p_token_hash text
) returns table(fleet_id bigint, expires_at timestamptz, quota integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare trust_row public.worker_site_controller_trust%rowtype;
declare capability_expires_at timestamptz;
begin
  if p_controller_hash !~ '^[0-9a-f]{64}$'
     or p_token_hash !~ '^[0-9a-f]{64}$' then return; end if;
  select * into trust_row from public.worker_site_controller_trust
  where controller_hash = p_controller_hash for update;
  if not found or trust_row.status <> 'approved' then return; end if;
  if not exists (select 1 from public.fleets where id = trust_row.fleet_id and active = true) then return; end if;
  if trust_row.last_capability_issued_at is not null
     and trust_row.last_capability_issued_at > now() - interval '1 minute' then return; end if;
  capability_expires_at := now() + make_interval(mins => trust_row.capability_ttl_minutes);
  insert into public.worker_site_bootstrap_capabilities(
    token_hash, fleet_id, expires_at, quota, issued_by_controller_hash
  ) values (p_token_hash, trust_row.fleet_id, capability_expires_at,
    trust_row.quota, p_controller_hash);
  update public.worker_site_controller_trust
  set last_capability_issued_at = now() where controller_hash = p_controller_hash;
  return query select trust_row.fleet_id, capability_expires_at, trust_row.quota;
end;
$$;

revoke all on function public.issue_site_bootstrap_capability(text, text)
  from public, anon, authenticated;
grant execute on function public.issue_site_bootstrap_capability(text, text) to service_role;

create or replace function public.provision_worker(
  p_bootstrap_hash text, p_fingerprint_hash text, p_worker_id text, p_ticket_hash text,
  p_hostname text default null, p_gpu_name text default null, p_vram_mb integer default 0,
  p_ticket_expires_at timestamptz default (now() + interval '30 minutes')
) returns table(worker_id text, ticket_hash text)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare capability public.worker_site_bootstrap_capabilities%rowtype;
declare binding public.worker_provisioning_bindings%rowtype;
begin
  if p_bootstrap_hash !~ '^[0-9a-f]{64}$'
     or p_fingerprint_hash !~ '^[a-f0-9]{64}$'
     or p_worker_id !~ '^cwsw_[a-f0-9]{32}$'
     or p_ticket_hash !~ '^[0-9a-f]{64}$'
     or p_vram_mb < 0 or length(coalesce(p_hostname, '')) > 255
     or length(coalesce(p_gpu_name, '')) > 240 or p_ticket_expires_at <= now()
     or p_ticket_expires_at > now() + interval '1 hour' then return; end if;
  select * into capability from public.worker_site_bootstrap_capabilities
  where token_hash = p_bootstrap_hash for update;
  if not found or capability.revoked_at is not null or capability.expires_at <= now() then return; end if;
  if capability.issued_by_controller_hash is not null
     and not exists (
       select 1 from public.worker_site_controller_trust
       where controller_hash = capability.issued_by_controller_hash
         and status = 'approved'
     ) then
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(capability.fleet_id::text || ':' || p_fingerprint_hash, 0));
  select * into binding from public.worker_provisioning_bindings
  where fleet_id = capability.fleet_id and fingerprint_hash = p_fingerprint_hash;
  if not found then
    if capability.used_count >= capability.quota then return; end if;
    insert into public.workers(worker_id, fleet_id, hostname, gpu_name, vram_mb, status,
      observed_state, health_state, last_seen_at)
    values (p_worker_id, capability.fleet_id, nullif(p_hostname, ''), nullif(p_gpu_name, ''),
      p_vram_mb, 'offline', 'INITIALIZING', 'UNKNOWN', now());
    insert into public.worker_provisioning_bindings(bootstrap_hash, fingerprint_hash, worker_id, fleet_id)
    values (p_bootstrap_hash, p_fingerprint_hash, p_worker_id, capability.fleet_id)
    returning * into binding;
    update public.worker_site_bootstrap_capabilities set used_count = used_count + 1
    where token_hash = p_bootstrap_hash;
  end if;
  insert into public.worker_enrollment_tickets(
    token_hash, expected_worker_id, fleet_id, fingerprint_hash, expires_at)
  values (p_ticket_hash, binding.worker_id, binding.fleet_id, p_fingerprint_hash, p_ticket_expires_at);
  return query select binding.worker_id, p_ticket_hash;
end;
$$;

revoke all on function public.provision_worker(text,text,text,text,text,text,integer,timestamptz)
  from public, anon, authenticated;
grant execute on function public.provision_worker(text,text,text,text,text,text,integer,timestamptz) to service_role;
