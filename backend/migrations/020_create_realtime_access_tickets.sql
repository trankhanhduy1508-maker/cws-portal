-- One-time short-lived WebSocket access tickets.
-- The bearer token never appears in a WebSocket URL.
CREATE TABLE IF NOT EXISTS public.realtime_access_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_hash text NOT NULL UNIQUE,
  job_id uuid NOT NULL REFERENCES public.render_orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS realtime_access_tickets_expiry_idx
  ON public.realtime_access_tickets(expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.realtime_access_tickets ENABLE ROW LEVEL SECURITY;

-- Backend service_role is the only writer/reader. No direct customer policy.
REVOKE ALL ON public.realtime_access_tickets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_realtime_access_ticket(
  p_ticket_hash text,
  p_job_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  UPDATE public.realtime_access_tickets
  SET used_at = now()
  WHERE ticket_hash = p_ticket_hash
    AND job_id = p_job_id
    AND used_at IS NULL
    AND expires_at > now()
  RETURNING customer_id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_realtime_access_ticket(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_realtime_access_ticket(text, uuid) TO service_role;
