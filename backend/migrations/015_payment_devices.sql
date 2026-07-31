-- Migration 015: dang ky thiet bi Android gui payment notification (PHAN 5/6
-- theo yeu cau bao mat: "notification den tu thiet bi da dang ky" + "request
-- signature hop le"). device_id la TEXT do CHINH app Android tu sinh
-- (UUID.randomUUID() luc cai dat lan dau, luu local) - Backend KHONG tu sinh,
-- chi ghi nhan khi admin dang ky thu cong (dung tinh than "MVP toi thieu" da
-- dung cho staff_roles migration 013: khong can man hinh dang ky).

create table if not exists public.payment_devices (
  device_id text primary key,
  label text,
  secret text not null,
  is_active boolean not null default true,
  manufacturer text,
  model text,
  android_version text,
  app_version text,
  notification_listener_enabled boolean,
  battery_optimization_ignored boolean,
  last_heartbeat_at timestamptz,
  last_notification_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

-- Ghi nhan notification nao den tu thiet bi nao - phuc vu audit + rate limit
-- theo tung device (xem DeviceSignatureGuard).
alter table public.payment_notifications
  add column if not exists device_id text references public.payment_devices(device_id);

create index if not exists idx_payment_notifications_device_created
  on public.payment_notifications (device_id, created_at desc);

alter table public.payment_devices enable row level security;

-- ===== Vi du dang ky 1 thiet bi (chay tay qua Supabase SQL Editor sau khi
-- cai app Android, lay device_id hien tren man hinh trang thai) =====
-- insert into public.payment_devices (device_id, label, secret)
-- values ('<device-id-hien-tren-app>', 'Dien thoai chu CWS', '<chuoi ngau nhien, vd openssl rand -hex 32>');
-- Dien CHINH XAC secret nay vao app Android luc build (xem android-payment-listener/README.md).

-- ===== ROLLBACK (chay tay neu can) =====
-- alter table public.payment_notifications drop column if exists device_id;
-- drop table if exists public.payment_devices;
