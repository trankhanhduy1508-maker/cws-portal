-- P0 privilege hardening discovered by Supabase Security Advisor (2026-08-04).
-- Keep worker RPCs available to the existing Worker credential, but remove
-- anonymous/authenticated execution from Admin SECURITY DEFINER RPCs.
-- This migration is additive and does not delete application data.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname LIKE 'admin\_%' ESCAPE '\\'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, authenticated, PUBLIC',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "allow insert remote_commands" ON public.remote_commands;
DROP POLICY IF EXISTS "allow read remote_commands" ON public.remote_commands;
REVOKE ALL ON TABLE public.remote_commands FROM anon, authenticated, PUBLIC;
GRANT ALL ON TABLE public.remote_commands TO service_role;

ALTER VIEW public.payment_reconciliation_anomalies
  SET (security_invoker = true);
REVOKE ALL ON public.payment_reconciliation_anomalies FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.payment_reconciliation_anomalies TO service_role;
