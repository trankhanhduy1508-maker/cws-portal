-- P2 manual Vietnam payments. Apply after 002_create_payments.sql.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS customer_id text,
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS received_amount_vnd integer,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confirmation_actor_id text,
  ADD COLUMN IF NOT EXISTS operator_note text;

UPDATE payments SET
  customer_id = COALESCE(customer_id, 'legacy-unassigned'),
  payment_reference = COALESCE(payment_reference, 'LEGACY-' || id::text),
  expires_at = COALESCE(expires_at, now()),
  method = CASE WHEN method IN ('mb_bank_transfer','momo_manual') THEN method ELSE 'mb_bank_transfer' END,
  status = CASE WHEN status IN ('awaiting_transfer','under_review','confirmed','original_unlocked','expired','underpaid','overpaid','rejected','refund_pending','refunded') THEN status ELSE 'expired' END;
ALTER TABLE payments ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN payment_reference SET NOT NULL;
ALTER TABLE payments ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('mb_bank_transfer', 'momo_manual'));
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('awaiting_transfer','under_review','confirmed','original_unlocked',
    'expired','underpaid','overpaid','rejected','refund_pending','refunded'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_reference ON payments(payment_reference);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_order ON payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id),
  actor_id text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('customer','admin','system')),
  action text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  received_amount_vnd integer,
  note text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payment_id, idempotency_key)
);

CREATE OR REPLACE FUNCTION deny_payment_event_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'payment_events are append-only'; END $$;
DROP TRIGGER IF EXISTS payment_events_append_only ON payment_events;
CREATE TRIGGER payment_events_append_only BEFORE UPDATE OR DELETE ON payment_events
FOR EACH ROW EXECUTE FUNCTION deny_payment_event_mutation();

CREATE OR REPLACE FUNCTION transition_payment_p2(
  p_payment_id uuid, p_actor_id text, p_actor_type text, p_action text,
  p_to_status text, p_received_amount_vnd integer, p_note text, p_idempotency_key text
) RETURNS SETOF payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_payment payments%ROWTYPE; prior_event payment_events%ROWTYPE;
BEGIN
  SELECT * INTO current_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment not found'; END IF;
  SELECT * INTO prior_event FROM payment_events
    WHERE payment_id = p_payment_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN QUERY SELECT * FROM payments WHERE id = p_payment_id; RETURN; END IF;

  IF p_actor_type = 'customer' AND NOT (
    current_payment.status = 'awaiting_transfer' AND p_to_status = 'under_review'
  ) THEN RAISE EXCEPTION 'customer transition denied'; END IF;
  IF p_actor_type = 'admin' AND NOT (
    (current_payment.status IN ('under_review','underpaid','overpaid') AND p_to_status IN ('confirmed','underpaid','overpaid','rejected'))
    OR (current_payment.status IN ('confirmed','original_unlocked','refund_pending') AND p_to_status IN ('refund_pending','refunded'))
  ) THEN RAISE EXCEPTION 'admin transition denied'; END IF;

  UPDATE payments SET status = p_to_status, received_amount_vnd = COALESCE(p_received_amount_vnd, received_amount_vnd),
    operator_note = p_note, confirmation_actor_id = CASE WHEN p_to_status='confirmed' THEN p_actor_id ELSE confirmation_actor_id END,
    confirmed_at = CASE WHEN p_to_status='confirmed' THEN now() ELSE confirmed_at END, updated_at = now()
    WHERE id = p_payment_id;
  INSERT INTO payment_events(payment_id,actor_id,actor_type,action,from_status,to_status,received_amount_vnd,note,idempotency_key)
    VALUES(p_payment_id,p_actor_id,p_actor_type,p_action,current_payment.status,p_to_status,p_received_amount_vnd,p_note,p_idempotency_key);
  RETURN QUERY SELECT * FROM payments WHERE id = p_payment_id;
END $$;

CREATE OR REPLACE FUNCTION consume_payment_p2(
  p_payment_id uuid, p_customer_id text, p_order_id uuid, p_expected_amount_vnd integer
) RETURNS SETOF payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_payment payments%ROWTYPE;
BEGIN
  SELECT * INTO current_payment FROM payments WHERE id=p_payment_id FOR UPDATE;
  IF NOT FOUND OR current_payment.customer_id IS DISTINCT FROM p_customer_id
    OR current_payment.status <> 'confirmed'
    OR current_payment.amount_vnd <> p_expected_amount_vnd
    OR current_payment.expires_at <= now()
    OR (current_payment.order_id IS NOT NULL AND current_payment.order_id <> p_order_id)
  THEN RAISE EXCEPTION 'payment not consumable'; END IF;
  UPDATE payments SET order_id=p_order_id, updated_at=now() WHERE id=p_payment_id;
  INSERT INTO payment_events(payment_id,actor_id,actor_type,action,from_status,to_status,idempotency_key)
    VALUES(p_payment_id,p_customer_id,'system','BOUND_TO_ORDER',current_payment.status,current_payment.status,'consume:'||p_order_id)
    ON CONFLICT(payment_id,idempotency_key) DO NOTHING;
  RETURN QUERY SELECT * FROM payments WHERE id=p_payment_id;
END $$;

REVOKE ALL ON FUNCTION transition_payment_p2(uuid,text,text,text,text,integer,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION consume_payment_p2(uuid,text,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION transition_payment_p2(uuid,text,text,text,text,integer,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION consume_payment_p2(uuid,text,uuid,integer) TO service_role;

UPDATE render_orders SET payment_status = CASE
  WHEN payment_status = 'paid' THEN 'confirmed'
  ELSE 'expired'
END
WHERE payment_status NOT IN ('awaiting_transfer','under_review','confirmed','original_unlocked',
  'expired','underpaid','overpaid','rejected','refund_pending','refunded');

ALTER TABLE render_orders DROP CONSTRAINT IF EXISTS render_orders_payment_status_check;
ALTER TABLE render_orders ADD CONSTRAINT render_orders_payment_status_check
  CHECK (payment_status IN ('awaiting_transfer','under_review','confirmed','original_unlocked',
    'expired','underpaid','overpaid','rejected','refund_pending','refunded'));

ALTER TABLE render_orders ADD COLUMN IF NOT EXISTS customer_id text;
UPDATE render_orders SET customer_id='legacy-unassigned' WHERE customer_id IS NULL;
ALTER TABLE render_orders ALTER COLUMN customer_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_render_orders_customer ON render_orders(customer_id, created_at DESC);

CREATE OR REPLACE FUNCTION audit_payment_created_p2() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO payment_events(payment_id,actor_id,actor_type,action,from_status,to_status,idempotency_key)
  VALUES(NEW.id,NEW.customer_id,'customer','PAYMENT_CREATED',NULL,NEW.status,'created:'||NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payments_created_audit ON payments;
CREATE TRIGGER payments_created_audit AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION audit_payment_created_p2();
