-- Spec 008 convergence: quarantine verdicts and durable job idempotency.
-- Additive only. Apply in staging first, then production with explicit approval.
set lock_timeout = '5s';
set statement_timeout = '30s';

alter table public.input_uploads
  drop constraint if exists input_uploads_object_key_check;

alter table public.input_uploads
  add constraint input_uploads_object_key_check check (
    object_key ~* '^uploads/[0-9a-f-]{36}-[^/]+\.(blend|zip|rar)$'
  );

alter table public.input_uploads
  add column if not exists security_state text not null default 'MATERIALIZED_QUARANTINED',
  add column if not exists security_verdict text,
  add column if not exists security_reason text,
  add column if not exists scanner_engine text,
  add column if not exists scanner_version text,
  add column if not exists signature_database_version text,
  add column if not exists content_sha256 text,
  add column if not exists security_scanned_at timestamptz;

alter table public.input_uploads
  drop constraint if exists input_uploads_security_state_check;

alter table public.input_uploads
  add constraint input_uploads_security_state_check check (
    security_state in (
      'MATERIALIZED_QUARANTINED', 'SECURITY_SCANNING', 'INPUT_SAFE', 'INPUT_REJECTED'
    )
  );

alter table public.render_orders
  add column if not exists idempotency_key text,
  add column if not exists request_fingerprint text;

alter table public.render_orders
  drop constraint if exists render_orders_idempotency_key_length;

alter table public.render_orders
  add constraint render_orders_idempotency_key_length check (
    idempotency_key is null or idempotency_key ~ '^[A-Za-z0-9._~-]{16,128}$'
  );

create unique index if not exists uq_render_orders_idempotency_key
  on public.render_orders (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_input_uploads_security_state
  on public.input_uploads (security_state, created_at desc);

comment on column public.input_uploads.security_state is
  'Server-authoritative Spec 008 gate; only INPUT_SAFE may create a render order.';

-- No destructive rollback is included. Any rollback requires explicit Founder approval.
