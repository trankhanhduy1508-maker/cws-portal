-- MVP review/edit workflow: persist each customer request with an auditable status.
-- Additive migration: no existing rows/data are deleted.
CREATE TABLE IF NOT EXISTS public.edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.render_orders(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  note text,
  status text NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DECLINED')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expected_response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edit_requests_job_id_created_at_idx
  ON public.edit_requests(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS edit_requests_status_created_at_idx
  ON public.edit_requests(status, created_at DESC);

ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS edit_requests_customer_select_own ON public.edit_requests;
CREATE POLICY edit_requests_customer_select_own
  ON public.edit_requests
  FOR SELECT
  USING (auth.uid() = requested_by);
