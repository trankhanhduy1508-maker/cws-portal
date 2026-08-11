-- Founder decision 2026-08-11: Customer render tiers/speed profiles are removed.
-- Scheduler owns capacity automatically; render_orders no longer persists a
-- customer-selected profile.

alter table public.render_orders
  drop column if exists profile_id;
