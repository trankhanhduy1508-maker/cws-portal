-- Staging-only hardening for administrative SECURITY DEFINER RPCs.
-- Admin actions must enter through the authenticated backend service boundary;
-- browser/client roles must not be able to invoke them through PostgREST.

revoke execute on function public.admin_cancel_job(text) from public, anon, authenticated;
revoke execute on function public.admin_confirm_host_usage_final_amount(bigint, numeric) from public, anon, authenticated;
revoke execute on function public.admin_requeue_task(bigint) from public, anon, authenticated;
revoke execute on function public.admin_retry_task(bigint) from public, anon, authenticated;
revoke execute on function public.admin_set_worker_drain(text, boolean, text) from public, anon, authenticated;
revoke execute on function public.admin_set_worker_quarantine(text, boolean, text) from public, anon, authenticated;

alter function public.admin_cancel_job(text)
  set search_path = public, pg_temp;

comment on function public.admin_cancel_job(text) is
  'Admin-only RPC; client-role EXECUTE revoked in staging and search_path pinned.';
