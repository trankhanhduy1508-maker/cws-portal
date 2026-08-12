-- Spec 009 rollout bridge: preserve the historical seven-argument enrollment
-- contract while the automatic fingerprint-bound path rolls out.
-- Do not use this overload for new automatic provisioning.
set lock_timeout = '5s';
set statement_timeout = '30s';

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

  -- A legacy ticket is explicitly unbound. Automatic tickets must use the
  -- fingerprint-bound eight-argument overload from migration 030.
  if not found
     or ticket.expected_worker_id <> p_worker_id
     or ticket.fingerprint_hash is not null
     or ticket.expires_at <= now() then
    return false;
  end if;

  -- A lost response may retry the same legacy enrollment safely. Any other
  -- replay remains rejected without rotating the identity.
  if ticket.consumed_at is not null then
    return ticket.consumed_worker_id = p_worker_id
      and ticket.consumed_credential_hash = p_credential_hash;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_worker_id, 0));
  if exists (
    select 1 from public.worker_identities where worker_id = p_worker_id
  ) then
    return false;
  end if;

  -- No upsert is allowed here: a legacy ticket must never take over or
  -- mutate an existing Worker row. A concurrent unique collision fails closed.
  begin
    insert into public.workers (
      worker_id, fleet_id, hostname, gpu_name, vram_mb,
      status, observed_state, health_state, last_seen_at
    ) values (
      p_worker_id, ticket.fleet_id, nullif(p_hostname, ''),
      nullif(p_gpu_name, ''), p_vram_mb,
      'offline', 'INITIALIZING', 'UNKNOWN', now()
    );

    insert into public.worker_identities (
      worker_id, credential_hash, status, expires_at
    ) values (
      p_worker_id, p_credential_hash, 'active', p_expires_at
    );
  exception when unique_violation then
    -- Roll back both inserts as one subtransaction. A race must not leave an
    -- uncredentialed Worker row behind.
    return false;
  end;

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
