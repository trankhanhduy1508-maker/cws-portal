-- Production Worker identity/authentication contract.
-- Founder provisions one random credential per worker out of band. Only its
-- SHA-256 hash is stored here; the bearer secret never enters Supabase.
create table if not exists public.worker_identities (
  worker_id text primary key references public.workers(worker_id) on delete cascade,
  credential_hash text not null check (credential_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_authenticated_at timestamptz
);

create table if not exists public.worker_auth_nonces (
  worker_id text not null references public.worker_identities(worker_id) on delete cascade,
  nonce text not null check (length(nonce) between 16 and 128),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (worker_id, nonce)
);

create index if not exists idx_worker_auth_nonces_expires_at
  on public.worker_auth_nonces(expires_at);

alter table public.worker_identities enable row level security;
alter table public.worker_auth_nonces enable row level security;
revoke all on public.worker_identities from public, anon, authenticated;
revoke all on public.worker_auth_nonces from public, anon, authenticated;

comment on table public.worker_identities is
  'Per-worker credential hash and lifecycle. Backend service-role only; worker_id is not a credential.';
comment on table public.worker_auth_nonces is
  'Per-worker replay cache for signed RPC requests. Backend service-role only.';

-- Operational cleanup is intentionally manual/owner-controlled until a
-- scheduled maintenance path is approved. Authentication rejects expired
-- credentials and never relies on nonce cleanup for security.
