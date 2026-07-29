-- P2 secure outputs: private object keys, idempotent unlock, append-only download audit.
CREATE TABLE IF NOT EXISTS outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES render_orders(id) ON DELETE CASCADE,
  object_key text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  status text NOT NULL DEFAULT 'locked' CHECK (status IN ('locked','unlocked','revoked')),
  unlocked_at timestamptz,
  unlocked_by text,
  relocked_at timestamptz,
  relock_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS download_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id uuid NOT NULL REFERENCES outputs(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES render_orders(id) ON DELETE RESTRICT,
  actor_id text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('customer','admin','system')),
  action text NOT NULL CHECK (action IN ('UNLOCKED','ACCESS_GRANTED','DOWNLOAD_REDEEMED','RELOCKED','ACCESS_DENIED')),
  idempotency_key text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(output_id, action, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_download_events_order_created ON download_events(order_id, created_at DESC);
CREATE OR REPLACE FUNCTION deny_download_event_mutation_p2() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'download_events are append-only'; END $$;
DROP TRIGGER IF EXISTS download_events_immutable ON download_events;
CREATE TRIGGER download_events_immutable BEFORE UPDATE OR DELETE ON download_events
FOR EACH ROW EXECUTE FUNCTION deny_download_event_mutation_p2();

CREATE OR REPLACE FUNCTION register_output_p2(p_order_id uuid,p_object_key text,p_size_bytes bigint)
RETURNS SETOF outputs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO outputs(order_id,object_key,size_bytes,status)
  VALUES(p_order_id,p_object_key,p_size_bytes,'locked')
  ON CONFLICT(order_id) DO UPDATE SET object_key=EXCLUDED.object_key,size_bytes=EXCLUDED.size_bytes,
    status='locked',unlocked_at=NULL,unlocked_by=NULL,updated_at=now();
  RETURN QUERY SELECT * FROM outputs WHERE order_id=p_order_id;
END $$;

CREATE OR REPLACE FUNCTION unlock_output_p2(p_order_id uuid,p_actor_id text)
RETURNS SETOF outputs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o outputs%ROWTYPE; p payments%ROWTYPE;
BEGIN
  SELECT * INTO o FROM outputs WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'output not ready'; END IF;
  SELECT * INTO p FROM payments WHERE order_id=p_order_id FOR UPDATE;
  IF NOT FOUND OR p.status NOT IN ('confirmed','original_unlocked') THEN RAISE EXCEPTION 'payment not eligible'; END IF;
  IF o.status <> 'unlocked' THEN
    UPDATE outputs SET status='unlocked',unlocked_at=now(),unlocked_by=p_actor_id,updated_at=now() WHERE id=o.id;
    INSERT INTO download_events(output_id,order_id,actor_id,actor_type,action,idempotency_key)
      VALUES(o.id,p_order_id,p_actor_id,'system','UNLOCKED','unlock:'||p_order_id)
      ON CONFLICT DO NOTHING;
  END IF;
  UPDATE payments SET status='original_unlocked',updated_at=now()
    WHERE id=p.id AND status='confirmed';
  RETURN QUERY SELECT * FROM outputs WHERE id=o.id;
END $$;

CREATE OR REPLACE FUNCTION authorize_output_access_p2(
  p_order_id uuid,p_actor_id text,p_is_admin boolean,p_action text,p_idempotency_key text,p_expires_at timestamptz
) RETURNS SETOF outputs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o outputs%ROWTYPE; r render_orders%ROWTYPE; p payments%ROWTYPE;
BEGIN
  SELECT * INTO r FROM render_orders WHERE id=p_order_id;
  SELECT * INTO o FROM outputs WHERE order_id=p_order_id FOR UPDATE;
  SELECT * INTO p FROM payments WHERE order_id=p_order_id;
  IF NOT FOUND OR o.id IS NULL OR r.id IS NULL THEN RAISE EXCEPTION 'output unavailable'; END IF;
  IF NOT p_is_admin AND r.customer_id IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'output unavailable'; END IF;
  IF r.status <> 'finished' OR o.status <> 'unlocked' OR p.status NOT IN ('confirmed','original_unlocked')
    THEN RAISE EXCEPTION 'output locked'; END IF;
  INSERT INTO download_events(output_id,order_id,actor_id,actor_type,action,idempotency_key,expires_at)
    VALUES(o.id,p_order_id,p_actor_id,CASE WHEN p_is_admin THEN 'admin' ELSE 'customer' END,
      p_action,p_idempotency_key,p_expires_at)
    ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT * FROM outputs WHERE id=o.id;
END $$;

CREATE OR REPLACE FUNCTION relock_output_on_payment_p2() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o outputs%ROWTYPE;
BEGIN
  IF NEW.status IN ('rejected','refund_pending','refunded','expired') AND NEW.order_id IS NOT NULL THEN
    SELECT * INTO o FROM outputs WHERE order_id=NEW.order_id FOR UPDATE;
    IF FOUND AND o.status <> 'revoked' THEN
      UPDATE outputs SET status='revoked',relocked_at=now(),relock_reason=NEW.status,updated_at=now() WHERE id=o.id;
      INSERT INTO download_events(output_id,order_id,actor_id,actor_type,action,idempotency_key)
        VALUES(o.id,NEW.order_id,COALESCE(NEW.confirmation_actor_id,'system'),'system','RELOCKED','relock:'||NEW.status||':'||NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_relocks_output_p2 ON payments;
CREATE TRIGGER payment_relocks_output_p2 AFTER UPDATE OF status ON payments
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION relock_output_on_payment_p2();

UPDATE render_orders SET download_url=NULL WHERE download_url IS NOT NULL;
REVOKE ALL ON outputs,download_events FROM anon,authenticated;
REVOKE ALL ON FUNCTION register_output_p2(uuid,text,bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION unlock_output_p2(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION authorize_output_access_p2(uuid,text,boolean,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_output_p2(uuid,text,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION unlock_output_p2(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION authorize_output_access_p2(uuid,text,boolean,text,text,timestamptz) TO service_role;
