# CWS Admin AAL2 Staging Runtime Plan — 2026-08-05

## Current evidence

- `staff_roles` and `staff_worker_access` exist in staging and have RLS enabled with no client policies.
- Admin SECURITY DEFINER RPCs in staging are pinned to `search_path=public, pg_temp` and deny `anon`/`authenticated` EXECUTE.
- The Node Agent heartbeat and fleet state evidence remains real runtime evidence; this plan does not fake heartbeat or query customer data.
- Status: **BLOCKED** pending an Owner-created staging Auth identity and TOTP enrollment.

## Owner-only steps

1. In the Supabase Dashboard, select project `cws-staging` → Authentication → Users → Add user. Create one disposable staging Admin email/password identity; do not paste the password or TOTP secret into chat.
2. Sign in to the staging Admin frontend with that identity and enroll Supabase Auth TOTP MFA. Complete one fresh sign-in so the access token has `aal2`.
3. Give the resulting user UUID to the staging-only provisioning path (or run the reviewed staging SQL with the UUID): add role `admin` in `staff_roles`, then grant only the staging fleet/worker in `staff_worker_access`.
4. Do not create browser policies or put a service-role key in the browser. The backend remains the only privileged caller.

## Verification sequence after enrollment

1. AAL1 token: Admin fleet and worker-control endpoints must return `401/403`.
2. AAL2 token: the same endpoints must return only the authorized staging fleet/worker state.
3. Verify session expiry and revocation by signing out/revoking the staging user and retrying the endpoint.
4. With the real staging Node Agent, observe `ONLINE`/`ACTIVE_IDLE`, `PREPARING`, `BUSY`, `RECOVERY`, and stale-heartbeat `OFFLINE`; record `workerState`, `currentTaskId`, `lastSeen`, `health`, and capability without exposing tokens or customer data.

Until steps 1–4 are captured through the real Admin runtime, status remains **UNVERIFIED** for the Admin state matrix and production remains **NO-GO**.
