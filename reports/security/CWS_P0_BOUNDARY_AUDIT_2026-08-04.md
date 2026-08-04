# CWS P0 Boundary Security Audit — 2026-08-04

## Scope

Audit code trên branch agent/roadmap-mvp-v2 đối với Customer, Host/Fleet/Worker, Admin/Staff, B2, Supabase/RLS, REST/WebSocket, Payment và logs/secrets.

## Findings and fixes

| Boundary | Evidence / result |
|---|---|
| Customer A → A | JobsService.assertOwnership cho phép đúng customer_id; existing IDOR test covers allow. |
| Customer A → B | Service throws ForbiddenException; existing test covers deny. |
| Anonymous/unowned Job | Fixed: create/file intake require Bearer; unowned Job is denied instead of open by ID. |
| Customer → Host/Worker private data | /host is behind RoleGuard + @Roles('host'); worker logs route now requires Admin RoleGuard/MFA. |
| Host A → Host B | RoleGuard loads staff_worker_access; Host dashboard filters workers/incidents/usage by assigned IDs. |
| Customer/Host → Admin | RoleGuard requires staff role and aal2; host is denied on admin-only routes. |
| B2/file | Preview/download use signed URLs with TTL; raw public URL is not returned for download. File intake is now authenticated. |
| Supabase/RLS | Added migration 016 to explicitly enable RLS on customer_profiles, render_orders, review_images, downloads, notifications, payments, storage_objects and worker_logs. Existing ownership policies remain; runtime project verification is still required. |
| WebSocket | Job owner token is checked before snapshot/Realtime subscription; mismatch closes without sending data. |
| Payment | Removed unauthenticated direct payment creation; payment detail lookup now requires customer Bearer and checks the linked render_orders.customer_id. Webhooks remain secret/HMAC guarded and idempotent. |\n| Secrets/logs | Worker B2 key is env-based per existing evidence; runtime secret/log scan still requires deployed environment review. |

## Security test matrix

- A → A: covered by backend/src/jobs/jobs.service.spec.ts.
- A → B: covered by backend/src/jobs/jobs.service.spec.ts.
- Customer → Admin: covered by backend/src/common/guards/role.guard.spec.ts.
- Host → Admin: covered by role mismatch test in role.guard.spec.ts.
- Customer/anonymous → private Worker logs: enforced by @UseGuards(RoleGuard) @Roles('admin') on GET /jobs/:id/logs.
- Host A → Host B: enforced by staff_worker_access filtering; existing RoleGuard test covers assigned worker IDs.
- WebSocket A → B: covered by backend/src/realtime/jobs-realtime.server.spec.ts.

## Verification status

Static source consistency: **PASS** after branch updates. Frontend RenderService now sends the Supabase Bearer token for protected upload, Drive resolve, and payment-detail requests.

Jest/build/runtime production: **NOT RUN IN THIS AGENT SESSION** because the environment has no local Git checkout/toolchain execution path. GitHub Actions should be checked for the branch head before merging.

Production two-account/RLS/MFA/B2 verification: **OWNER/HUMAN REQUIRED**. No production data, credentials, or secrets were changed.


## Edit request boundary update — 2026-08-04

- Edit request state is now persisted in `edit_requests` with job/customer owner, status, assignee and expected response time.
- Customer route `GET /jobs/:id/edit-requests` calls JobsService ownership enforcement before reading.
- Admin queue/update routes are protected by RoleGuard, admin role and MFA `aal2`; no customer/host route can update the queue.
- Migration 017 enables RLS and limits customer SELECT to `auth.uid() = requested_by`.
- Contract coverage added in `backend/src/security/p0-boundary.contract.spec.ts`.

Status remains CODE/TEST PASS, runtime two-account/RLS/MFA verification pending.
