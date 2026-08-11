# CURRENT_STATUS

## Current Phase
M0 — Separate Admin frontend is deployed; verify the final staff OAuth/MFA browser path, then resume Golden Production E2E.

## Last Verified
2026-08-11:
- Customer remains on the existing `https://cws-portal.vercel.app` production project;
- a separate Vercel project `cws-admin` now exists and is production READY;
- `https://cws-admin.vercel.app/` returns HTTP 200 with `<title>CWS Admin</title>` and the independently built Admin assets;
- the deployed Admin JS contains `CWS ADMIN`, `Workers / Nodes`, `System Health`, the Admin API tree, Google staff auth + MFA flow, and the dedicated-origin OAuth redirect logic;
- the Admin build mounts `AdminScreen` directly and does not use the Customer application as a routing fallback;
- PR #25 passed frontend + backend CI and was merged so OAuth returns dedicated Admin `/` to the same Admin origin while preserving the temporary shared-portal `/admin` rollback route;
- CWS architecture FigJam shows separate Customer/Admin frontends sharing the same backend/data plane.

The remaining Admin verification is interactive Auth configuration/runtime evidence: Supabase requires every explicit OAuth `redirectTo` to match the project's Redirect URLs allow list. The current Supabase connector does not expose hosted Auth URL Configuration read/write, so `https://cws-admin.vercel.app/` must still be confirmed in Additional Redirect URLs through an interactive browser test or Dashboard setting.

Golden Production E2E is still not proven. Existing evidence remains:
- `reports/evidence/CWS_FULL_PRODUCTION_INTEGRATION_TRACE_2026-08-08.md`
- `reports/evidence/CWS_PRODUCTION_DEMO_PATH_REALITY_AUDIT_2026-08-08.md`
- `reports/evidence/CWS_WORKER_RESILIENCE_PRODUCTION_RUNTIME_2026-08-08.md`

## Current Task
`specs/007-separate-admin-frontend/`

Production endpoints:
- Customer: `https://cws-portal.vercel.app`
- Admin: `https://cws-admin.vercel.app/`

The separate Admin frontend preserves Google staff login + Supabase TOTP/AAL2 + backend staff-role authorization and continues to use the existing Render backend, Supabase, B2, Workers and SePay.

## Next
1. Open `https://cws-admin.vercel.app/` in a real browser.
2. Run Google staff login. If Supabase refuses/falls back because the callback is not allow-listed, add exact `https://cws-admin.vercel.app/` under Authentication -> URL Configuration -> Additional Redirect URLs, preserving all existing entries.
3. Complete TOTP/AAL2 and verify the Admin dashboard shows `CWS ADMIN` on the separate hostname.
4. Record Founder browser evidence, then retire/redirect the legacy Customer Portal Admin route.
5. Return immediately to the first real production E2E bottleneck using the canonical customer flow:

`Google Login -> Upload/Drive -> materialize/validate -> create customer-owned Job -> Worker claim -> Blender -> B2 locked output -> previews -> final price + QR -> SePay -> download`.

Do not claim Golden E2E PASS until the whole trace is evidenced with real current IDs/artifacts.

## Last Updated
2026-08-11 — separate Admin production deployment verified; interactive OAuth/MFA remains.
