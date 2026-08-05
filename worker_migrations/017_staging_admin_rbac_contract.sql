-- Staging-only Admin/Host RBAC contract.
-- Apply only to the isolated cws-staging project. No seed user is embedded.
create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'host')),
  created_at timestamptz not null default now()
);

create table if not exists public.staff_worker_access (
  user_id uuid not null references public.staff_roles(user_id) on delete cascade,
  worker_id text not null references public.workers(worker_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, worker_id)
);

create index if not exists idx_staff_worker_access_user_id
  on public.staff_worker_access (user_id);

alter table public.staff_roles enable row level security;
alter table public.staff_worker_access enable row level security;

-- Deliberately no anon/authenticated policies. Backend service access reads these
-- tables; browser/client never receives a service-role credential.
