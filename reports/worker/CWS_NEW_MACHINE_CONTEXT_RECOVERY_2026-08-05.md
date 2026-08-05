# CWS new Windows machine context recovery — 2026-08-05

## Repository

- Official remote: `https://github.com/trankhanhduy1508-maker/cws-portal.git`
- Checkout: `C:\Users\Administrator\cws-portal`
- Branch: `main`
- Initial synchronized HEAD: `72a175ba489a6cbbd7ea2bf4d2e71c223653cbd8`
- No duplicate checkout was found; working tree was clean before this task.
- GitHub access confirmed with pull/push permission.

## Machine environment

- User-scoped Git for Windows: `C:\Users\Administrator\Tools\Git`.
- User-scoped Python 3.12.10 with pip: `C:\Users\Administrator\Tools\Python312`.
- Node 24.19.0 and npm 11.17.0 were already present.
- Blender, Supabase CLI, B2 credentials and `CWS_STAGING_*` variables are absent.
- No production credential or production data was used.

## Safe fixes and staging preparation

- Corrected the generic engine PNG signature literal so structural PNG validation matches real PNG bytes.
- Corrected an existing Worker test syntax error and made retry-backoff assertions follow explicit non-blocking transitions.
- Added strict staging assignment-to-JobSpec parsing and mandatory `CWS_STAGING_B2_PREFIX` configuration.
- Added placeholder-only `worker/staging.env.example`.

## Verification

- `worker/*.py` compile: PASS.
- Worker/Node Agent offline suite: **28/28 PASS**.
- No Blender process, Supabase RPC, B2 object, production mutation or power action was attempted.

This verifies machine preparation and credential-free contracts only. It does not change existing REAL RUNTIME VERIFIED evidence and does not claim staging integration or FULL E2E.

## Next

Run the real staging E2E procedure when isolated staging artifacts and credentials are present.
