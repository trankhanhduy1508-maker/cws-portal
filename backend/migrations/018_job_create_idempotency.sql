-- CWS MVP: durable idempotency for POST /jobs retries.
-- Additive only. Run after 017 in isolated staging, then production.
ALTER TABLE render_orders
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

ALTER TABLE render_orders
  DROP CONSTRAINT IF EXISTS render_orders_idempotency_key_length;

ALTER TABLE render_orders
  ADD CONSTRAINT render_orders_idempotency_key_length
  CHECK (idempotency_key IS NULL OR idempotency_key ~ '^[A-Za-z0-9._~-]{16,128}$');

CREATE UNIQUE INDEX IF NOT EXISTS uq_render_orders_idempotency_key
  ON render_orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Rollback (only with approval; preserves rows):
-- DROP INDEX IF EXISTS uq_render_orders_idempotency_key;
-- ALTER TABLE render_orders DROP CONSTRAINT IF EXISTS render_orders_idempotency_key_length;
-- ALTER TABLE render_orders DROP COLUMN IF EXISTS request_fingerprint;
-- ALTER TABLE render_orders DROP COLUMN IF EXISTS idempotency_key;
