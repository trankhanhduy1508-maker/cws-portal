-- Explicitly remove Supabase role grants from the one-time realtime RPC.
-- REVOKE PUBLIC alone does not remove explicit anon/authenticated grants.
REVOKE EXECUTE ON FUNCTION public.consume_realtime_access_ticket(text, uuid)
  FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_realtime_access_ticket(text, uuid)
  TO service_role;
