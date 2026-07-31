-- Migration 013: RBAC toi thieu cho Admin/Host — dong lo hong "chi bao ve
-- bang 1 shared secret tinh (x-admin-key), khong co role that, khong co
-- Host Dashboard rieng" (xem admin-key.guard.ts). Tai khoan Admin/Host
-- tao THU CONG qua Supabase Auth (Dashboard) + insert 1 dong vao
-- staff_roles bang SQL duoi day — KHONG can man hinh moi/tao tai khoan.
--
-- 1 Host co the quan ly NHIEU worker (bang noi N-N staff_worker_access),
-- dung worker_id (text, cot co san tren public.workers) lam khoa noi.

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

create index if not exists idx_staff_worker_access_user_id on public.staff_worker_access (user_id);

-- RLS: bat nhung KHONG tao policy nao — chi Backend (service_role, tu
-- dong bypass RLS) doc/ghi duoc, dung nguyen tac da dat ra o migration
-- 007 cho payments/sites/machine_capability ("RLS bat + khong policy =
-- tu choi moi truy cap truc tiep tu anon/authenticated").
alter table public.staff_roles enable row level security;
alter table public.staff_worker_access enable row level security;

-- ===== Vi du tao tai khoan Admin/Host (chay tay sau khi da tao user
-- qua Supabase Dashboard > Authentication > Users > Add user) =====
-- insert into public.staff_roles (user_id, role) values ('<uuid-cua-user>', 'admin');
-- insert into public.staff_roles (user_id, role) values ('<uuid-cua-host>', 'host');
-- insert into public.staff_worker_access (user_id, worker_id) values ('<uuid-cua-host>', '<worker_id>');

-- ===== ROLLBACK (chay tay neu can) =====
-- drop table if exists public.staff_worker_access;
-- drop table if exists public.staff_roles;
