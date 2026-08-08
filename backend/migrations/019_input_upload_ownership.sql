-- Bind every customer upload object to the authenticated Supabase user that
-- created it. The backend service-role is the only runtime writer/reader;
-- customers never query this table directly.
set lock_timeout = '5s';
set statement_timeout = '30s';

create table if not exists public.input_uploads (
  object_key text primary key,
  customer_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 2147483648),
  created_at timestamptz not null default now(),
  constraint input_uploads_object_key_check check (
    object_key ~* '^uploads/[0-9a-f-]{36}-[^/]+\.(blend|zip)$'
  )
);

alter table public.input_uploads enable row level security;
revoke all on table public.input_uploads from public, anon, authenticated;
grant select, insert, update, delete on table public.input_uploads to service_role;

create index if not exists idx_input_uploads_customer_created
  on public.input_uploads (customer_id, created_at desc);

comment on table public.input_uploads is
  'Server-side ownership boundary for customer B2 upload object keys.';

-- Read-only preflight before applying:
-- select to_regclass('public.input_uploads') as existing_table;
-- select to_regclass('public.render_orders') as required_render_orders;
--
-- Rollback (requires explicit approval; B2 objects are not deleted):
-- drop table if exists public.input_uploads;
