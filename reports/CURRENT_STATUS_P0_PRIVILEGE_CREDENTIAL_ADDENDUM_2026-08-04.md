# CURRENT_STATUS Addendum — P0 Supabase Privilege + Credential Hardening — 2026-08-04

This addendum supplements CURRENT_STATUS.md on branch agent/roadmap-mvp-v2.

- Supabase Security Advisor identified and the applied migration fixed anonymous execution of Admin SECURITY DEFINER RPCs.
- `remote_commands` public policies/grants were removed.
- `payment_reconciliation_anomalies` was changed to `security_invoker` and public grants were removed.
- Literal Supabase/B2 credentials were removed from `cws_worker_full.py`, `cws_worker.bat`, and `cws_auto_ghep_video.bat`; launchers now require environment variables.
- Evidence: `reports/security/CWS_P0_PRIVILEGE_CREDENTIAL_HARDENING_2026-08-04.md`.
- Status: code + database privilege fix PASS; Worker credential rollout, two-account verification, and Full E2E remain unverified.
- Owner TODO: rotate/revoke credentials that were present in Git history after a replacement Worker credential is provisioned. Codex did not rotate/revoke production secrets.
