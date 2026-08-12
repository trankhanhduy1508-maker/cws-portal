-- Spec 009 follow-up: fail closed for NULL automatic enrollment inputs.
-- Migration 030 is already applied and remains unchanged.
set lock_timeout = '5s';
set statement_timeout = '30s';

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
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ticket public.worker_enrollment_tickets%rowtype;
begin
  if p_token_hash is null
     or p_worker_id is null
     or p_credential_hash is null
     or p_fingerprint_hash is null
     or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_worker_id !~ '^cwsw_[a-f0-9]{32}$'
     or p_credential_hash !~ '^[0-9a-f]{64}$'
     or p_fingerprint_hash !~ '^[a-f0-9]{64}$'
     or p_vram_mb < 0
     or p_expires_at <= now()
     or p_expires_at > now() + interval '365 days' then
    return false;
  end if;

  select * into ticket
  from public.worker_enrollment_tickets
  where token_hash = p_token_hash
  for update;

  if not found
     or ticket.expected_worker_id <> p_worker_id
     or ticket.fingerprint_hash is distinct from p_fingerprint_hash
     or ticket.expires_at <= now() then
    return false;
  end if;
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
  insert into public.worker_identities(worker_id, credential_hash, status, expires_at)
    values (p_worker_id, p_credential_hash, 'active', p_expires_at);
  update public.worker_enrollment_tickets set
    consumed_at = now(),
    consumed_worker_id = p_worker_id,
    consumed_credential_hash = p_credential_hash
  where token_hash = p_token_hash;
  return true;
end;
$$;

revoke all on function public.consume_worker_enrollment(
  text,text,text,text,text,integer,timestamptz,text
) from public, anon, authenticated;
grant execute on function public.consume_worker_enrollment(
  text,text,text,text,text,integer,timestamptz,text
) to service_role;
