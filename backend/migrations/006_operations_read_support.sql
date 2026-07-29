-- P2 minimum Operations Console: additive read support only.
ALTER TABLE render_orders
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS failure_message text;

CREATE OR REPLACE FUNCTION touch_render_order_updated_at_p2()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS render_orders_touch_updated_at_p2 ON render_orders;
CREATE TRIGGER render_orders_touch_updated_at_p2
BEFORE UPDATE ON render_orders FOR EACH ROW
EXECUTE FUNCTION touch_render_order_updated_at_p2();

CREATE INDEX IF NOT EXISTS idx_render_orders_status_updated
  ON render_orders(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_render_orders_payment_updated
  ON render_orders(payment_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_job_status ON tasks(job_id, status);
CREATE INDEX IF NOT EXISTS idx_workers_last_seen ON workers(last_seen_at DESC);

-- Operations is served only by the backend service-role client after
-- JwtAuthGuard + AdminRoleGuard. Browser roles receive no direct access.
REVOKE ALL ON render_orders, payments, outputs, payment_events, download_events
  FROM anon, authenticated;
