-- Migration 014: audit log + chong trung cho notification MBBank (Android
-- Notification Listener gui ve POST /payment/notification). Moi request
-- toi endpoint nay ghi 1 dong o day TRUOC KHI xu ly (transaction_id la
-- UNIQUE constraint - chinh no la co che chong trung/replay, khong chi
-- kiem tra bang code). Neu hop le -> status='processed' + payment_id.
-- Neu khong hop le (sai so tien/khong tim thay payment/da PAID roi...)
-- -> status='rejected' + reject_reason, KHONG mo khoa gi ca.

create table if not exists public.payment_notifications (
  id bigint generated always as identity primary key,
  transaction_id text not null unique,
  amount_vnd numeric not null,
  transaction_time timestamptz,
  sender_name text,
  sender_account text,
  transfer_content text,
  balance_after numeric,
  raw_notification jsonb,
  status text not null check (status in ('processing', 'processed', 'rejected')),
  reject_reason text,
  payment_id uuid references public.payments(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_notifications_payment_id on public.payment_notifications (payment_id);
create index if not exists idx_payment_notifications_created_at on public.payment_notifications (created_at desc);

-- RLS bat + khong policy = chi Backend (service_role) doc/ghi duoc, dung
-- nguyen tac da dat o migration 007/013.
alter table public.payment_notifications enable row level security;

-- ===== ROLLBACK (chay tay neu can) =====
-- drop table if exists public.payment_notifications;
