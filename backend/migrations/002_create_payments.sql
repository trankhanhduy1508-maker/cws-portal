-- Migration 002: payments
-- Bảng MỚI, không liên quan schema cũ.

CREATE TABLE IF NOT EXISTS payments (
  id             uuid PRIMARY KEY,
  amount_vnd     integer NOT NULL CHECK (amount_vnd > 0),
  method         text NOT NULL CHECK (method IN ('wallet', 'qr_bank', 'stripe', 'paypal')),
  status         text NOT NULL DEFAULT 'processing'
                 CHECK (status IN ('unpaid', 'processing', 'paid', 'failed')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  confirmed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
