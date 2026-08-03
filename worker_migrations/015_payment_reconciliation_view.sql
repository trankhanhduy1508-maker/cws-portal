-- Payment/refund safety net (2026-08-03, Owner uy quyen truc tiep) --
-- View CHI DOC, khong sua bat ky bang nao - dung de Admin (qua Supabase
-- SQL Editor ngay bay gio, hoac sau nay wire vao Admin Dashboard khi co
-- moi truong Node/npm de build an toan) phat hien 3 rui ro da ghi trong
-- docs/MVP_GAP_REPORT.md + reports/payments/CWS_PAID_ORPHAN_ORDER_FINDING_2026-08-03.md
-- ma he thong hien KHONG co canh bao tu dong nao:
--
-- 1. PAID_WITHOUT_PAYMENT_RECORD: render_orders.payment_status='paid'
--    nhung KHONG co dong nao trong bang payments tuong ung - khong the
--    den tu webhook that (PaymentsService luon ghi payments TRUOC khi
--    set paid tren order), nen day la dau hieu du lieu fixture/test
--    con sot HOAC bug nghiem trong hon can dieu tra ngay.
-- 2. NOTIFICATION_STUCK_PROCESSING: payment_notifications.status=
--    'processing' qua 10 phut - dung yeu cau webhook backend crash
--    giua chung, khong co timeout/reaper tu dong (SEPAY_PAYMENT_
--    ARCHITECTURE_RESEARCH.md).
-- 3. PAID_NOT_DELIVERED: co payment THAT (payments.status='paid',
--    confirmed_at khong null) qua 2 tieng nhung job van chua sang
--    finished/cancelled/error - dung KICH BAN "khach mat tien that ma
--    khong nhan duoc file" ma docs/MVP_GAP_REPORT.md canh bao.
create or replace view public.payment_reconciliation_anomalies as
select
  'PAID_WITHOUT_PAYMENT_RECORD'::text as anomaly_type,
  ro.id::text as order_id,
  ro.storage_code,
  ro.status as order_status,
  ro.payment_status,
  ro.created_at as reference_time,
  null::numeric as amount_vnd
from render_orders ro
where ro.payment_status = 'paid'
  and not exists (select 1 from payments p where p.job_id = ro.id)

union all

select
  'NOTIFICATION_STUCK_PROCESSING'::text,
  pn.id::text,
  null::text,
  null::text,
  pn.status,
  pn.created_at,
  pn.amount_vnd
from payment_notifications pn
where pn.status = 'processing'
  and pn.created_at < now() - interval '10 minutes'

union all

select
  'PAID_NOT_DELIVERED'::text,
  ro.id::text,
  ro.storage_code,
  ro.status,
  ro.payment_status,
  p.confirmed_at,
  p.amount_vnd::numeric
from render_orders ro
join payments p on p.job_id = ro.id
where p.status = 'paid'
  and p.confirmed_at is not null
  and p.confirmed_at < now() - interval '2 hours'
  and ro.status not in ('finished', 'cancelled', 'error');

comment on view public.payment_reconciliation_anomalies is
  'Payment/refund safety net (2026-08-03) - view CHI DOC, gom 3 loai bat thuong thanh toan chua co canh bao tu dong: PAID_WITHOUT_PAYMENT_RECORD (payment_status lech khoi bang payments that), NOTIFICATION_STUCK_PROCESSING (webhook ket qua 10 phut), PAID_NOT_DELIVERED (da thanh toan that qua 2 tieng nhung chua nhan file - kich ban mat tien khong nhan output). Query truc tiep qua Supabase SQL Editor cho toi khi co moi truong build de wire vao Admin Dashboard.';
