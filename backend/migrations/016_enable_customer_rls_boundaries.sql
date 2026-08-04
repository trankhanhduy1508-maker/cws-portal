-- Migration 016: enforce customer RLS boundaries
-- P0 security fix (2026-08-04).
--
-- Migration 007 created ownership policies for these tables but did not
-- explicitly enable RLS on all of them. Without ENABLE ROW LEVEL SECURITY,
-- those policies are not enforced for direct anon/authenticated access.
-- This migration is additive: it does not delete data or policies.
--
-- Backend service_role access is intentionally preserved; customer clients
-- receive only rows allowed by the existing ownership policies in 007.

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Internal tables remain deny-by-default for direct client access. These
-- tables already have no customer policies in migration 007; enabling RLS
-- makes that deny-by-default behavior explicit and durable.
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_logs ENABLE ROW LEVEL SECURITY;
