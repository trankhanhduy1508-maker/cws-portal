# Admin Fleet staging runtime — AUTH BLOCKER

Date: 2026-08-05. Production was read-only; all schema mutation was staging-only.

## Contract audit

- CODE VERIFIED: `RoleGuard` requires a valid Supabase Bearer token, a `staff_roles` row with role `admin` or `host`, and JWT `aal: "aal2"`. Admin fleet routes use this guard.
- CODE VERIFIED: `staff_worker_access` is required for host-scoped access; Admin role can view the fleet contract without a browser-side service credential.
- REAL RUNTIME VERIFIED: Node Agent staging state events and heartbeat fields exist for the previously verified workers.
- STAGING REAL SCHEMA VERIFIED: migration `017_staging_admin_rbac_contract` created `staff_roles` and `staff_worker_access` with the production migration's exact columns/FKs; RLS is enabled and there are no direct anon/authenticated policies.
- PRODUCTION READ-ONLY METADATA VERIFIED: the current production project does not expose either RBAC table in `information_schema`; the repository's `backend/migrations/013_staff_roles_rbac.sql` is the canonical application contract. No production mutation was performed.

## Blocker

The Supabase connector has no safe Auth-user/MFA enrollment operation in this session. A staging staff user must be created by Owner in the staging Dashboard, enrolled in MFA, and given the `admin` row through the staging SQL editor. The staging backend also needs its server-only Supabase credential configured; no service-role value belongs in the browser or this chat.

Until that is done, Admin Fleet states, AAL2/RBAC, and stale-heartbeat `OFFLINE` cannot be claimed as Admin **REAL RUNTIME VERIFIED**. No auth bypass, fake heartbeat, or client service credential was used.

