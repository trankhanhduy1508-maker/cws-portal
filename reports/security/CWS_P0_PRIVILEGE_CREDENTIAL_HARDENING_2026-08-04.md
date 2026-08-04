# CWS P0 Credential and Supabase Privilege Hardening — 2026-08-04

## Findings

- Supabase Security Advisor identified anonymous execution for privileged admin_* SECURITY DEFINER RPCs.
- remote_commands had public allow-all INSERT/SELECT policies.
- payment_reconciliation_anomalies was a SECURITY DEFINER view.
- The Worker launcher contained literal Supabase/B2 credentials.

## Code changes

- Added backend/migrations/021_security_privilege_hardening.sql.
- Applied migration security_privilege_hardening_20260804 to project ynhxlxetwuiyejcjypsi.
- Admin RPC execution is restricted away from anon and authenticated; server-side service_role remains allowed.
- Removed public remote_commands policies and grants.
- Set reconciliation view to security_invoker and removed public grants.
- Worker Python/launcher/video batch now require credentials from environment variables; no literal credentials are distributed.
- Added credential hygiene contract coverage.

## Verification

- Supabase migration applied successfully.
- Security Advisor no longer reports the Admin RPCs, public remote_commands policies, or security-definer reconciliation view in the reported result.
- Remaining Advisor warnings concern Worker operational RPCs that still use the existing publishable Worker credential. Replacing that public credential with a dedicated least-privilege worker authentication path requires rollout on every Worker and is OWNER TODO; no current Worker credential was rotated or revoked.
- CI/runtime verification is still required for Worker credential injection and the full two-account matrix.

## Safety

No production rows were deleted or modified. No credential was printed or rotated. No machine reboot, shutdown, or logoff was performed.
