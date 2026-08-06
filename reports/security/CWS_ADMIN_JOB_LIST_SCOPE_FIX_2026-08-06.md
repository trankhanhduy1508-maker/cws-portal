# Admin job-list scope fix — 2026-08-06

## Finding

`GET /jobs` was resolving every valid Supabase Bearer token to a
`customerId` before checking whether the caller was an AAL2 admin. The Admin
Dashboard therefore could authenticate successfully but receive only jobs
whose `customer_id` matched the staff user's auth id.

## Fix

`JobsController.listAll()` now checks the existing server-side
`isAdminRequest()` boundary first. An authenticated AAL2 admin receives the
full job list; a normal authenticated customer remains scoped to their own
jobs; anonymous requests are rejected. No new bypass or production mutation
was introduced.

## Evidence

- `jobs.controller.spec.ts`: 3/3 PASS.
- Covered cases: AAL2 admin → `listAll(null)`, customer → `listAll(customerId)`,
  anonymous → `UnauthorizedException` and no repository call.
- Full backend test/build and frontend checks are required before commit.

## Remaining runtime gate

Production Render is still serving an older backend (`/staff/mfa-status`
returns 404), so the corrected route is code/test verified but not production
runtime verified until Founder repairs or triggers the Render deployment.
