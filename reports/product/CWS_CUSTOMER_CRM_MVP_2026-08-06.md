# Customer CRM MVP — 2026-08-06

## Audit and implementation

Existing `customer_profiles` already uses the Supabase Auth user id and stores
email, Google profile name, `created_at`, and `last_login_at`. Customer jobs
are represented by `render_orders.customer_id`; trusted payments are rows in
`payments` with `status = 'paid'` and `job_id` linked to a customer job.
No duplicate CRM schema or sensitive credential storage was added.

- Added `GET /customers/crm`.
- The repository aggregates existing profiles, render orders, and payments with
  the backend service-role client, returning only CRM summaries.
- Paid totals include only linked `paid` payments; orphan/non-paid rows are
  excluded. Lifecycle is `new`, `rendered`, or `returning`.
- The route uses existing `RoleGuard`, requiring staff role and `aal2`.
- Admin now shows a separate CRM table and a real `Đang Render` metric mapped
  from backend `nodeState === 'BUSY'`.

## Verification

- Backend: 22 suites / 136 tests PASS; build PASS.
- Frontend: 3 files / 8 tests PASS; lint PASS; build PASS.
- Vercel production deployment `dpl_6q4819cGaS3Hfv1y4xqtcQ62iREQ` is READY for
  commit `5e20211`; its bundle contains fleet/CRM endpoint markers and the
  production backend URL. Render initially returned HTTP 404 for
  `/customers/crm`; after the service auto-deployed from `main`, it now returns
  HTTP 401 without credentials while `/health` is HTTP 200. Route presence and
  protection are runtime verified; authenticated CRM data is not claimed
  without a real Admin AAL2 session.
