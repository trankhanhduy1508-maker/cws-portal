-- MVP support ticket state. Contact channel remains an Owner decision.
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.render_orders(id) ON DELETE SET NULL,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 160),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DECLINED')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_customer_created_idx
  ON public.support_tickets(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_created_idx
  ON public.support_tickets(status, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_customer_select_own ON public.support_tickets;
CREATE POLICY support_tickets_customer_select_own
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = customer_id);
