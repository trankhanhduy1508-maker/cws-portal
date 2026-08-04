-- Resumable customer upload state. Additive migration; no existing data is removed.
CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  multipart_upload_id text NOT NULL UNIQUE,
  file_name text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0),
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  total_parts integer NOT NULL CHECK (total_parts > 0),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABORTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE TABLE IF NOT EXISTS public.upload_session_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.upload_sessions(id) ON DELETE CASCADE,
  part_number integer NOT NULL CHECK (part_number > 0),
  etag text NOT NULL,
  part_size_bytes bigint NOT NULL CHECK (part_size_bytes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, part_number)
);

CREATE INDEX IF NOT EXISTS upload_sessions_customer_status_idx ON public.upload_sessions(customer_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS upload_session_parts_session_idx ON public.upload_session_parts(session_id, part_number);

ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_session_parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upload_sessions_customer_select_own ON public.upload_sessions;
CREATE POLICY upload_sessions_customer_select_own ON public.upload_sessions FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS upload_session_parts_customer_select_own ON public.upload_session_parts;
CREATE POLICY upload_session_parts_customer_select_own ON public.upload_session_parts FOR SELECT USING (EXISTS (SELECT 1 FROM public.upload_sessions s WHERE s.id = upload_session_parts.session_id AND auth.uid() = s.customer_id));

-- Keep this additive for environments that applied an earlier draft of migration 018.
ALTER TABLE public.upload_sessions ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours');
CREATE INDEX IF NOT EXISTS upload_sessions_expiry_idx ON public.upload_sessions(status, expires_at);
