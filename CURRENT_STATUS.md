# CURRENT_STATUS

## Current Phase
M0 — Source-of-truth convergence + Founder-approved Admin frontend separation before resuming Golden Production E2E.

## Last Verified
2026-08-11:
- the existing `cws-portal.vercel.app` Customer project is production READY;
- Admin routing fixes in the shared portal are code/deployment verified but Founder browser evidence still showed Customer UI during Admin access attempts;
- Founder explicitly approved separating Admin into its own frontend hostname;
- CWS architecture FigJam now shows separate Customer/Admin frontends sharing the same backend/data plane.

Golden Production E2E is still not proven. Existing evidence remains:
- `reports/evidence/CWS_FULL_PRODUCTION_INTEGRATION_TRACE_2026-08-08.md`
- `reports/evidence/CWS_PRODUCTION_DEMO_PATH_REALITY_AUDIT_2026-08-08.md`
- `reports/evidence/CWS_WORKER_RESILIENCE_PRODUCTION_RUNTIME_2026-08-08.md`

## Current Task
`specs/007-separate-admin-frontend/`

Build and deploy a separate Admin frontend from the same canonical GitHub repository:
- Customer: `cws-portal.vercel.app`
- Admin target: `cws-admin.vercel.app`

The Admin build must mount only the Admin tree and preserve Google staff login + Supabase TOTP/AAL2 + backend staff-role authorization. Do not duplicate Render, Supabase, B2, Workers, SePay, business data, or the GitHub repository.

## Next
1. Finish isolated Admin build + CI.
2. Merge after green verification.
3. Create/configure the explicitly approved `cws-admin` Vercel frontend project.
4. Obtain Founder browser evidence that the separate hostname shows the Admin login/dashboard.
5. Then return immediately to the first real production E2E bottleneck using the canonical customer flow:

`Google Login -> Upload/Drive -> materialize/validate -> create customer-owned Job -> Worker claim -> Blender -> B2 locked output -> previews -> final price + QR -> SePay -> download`.

Do not claim Golden E2E PASS until the whole trace is evidenced with real current IDs/artifacts.

## Last Updated
2026-08-11 — `specs/007-separate-admin-frontend/`
