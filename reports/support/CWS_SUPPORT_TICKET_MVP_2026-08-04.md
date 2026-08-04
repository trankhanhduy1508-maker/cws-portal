# CWS — Support Ticket MVP Evidence

Date: 2026-08-04
Branch: agent/roadmap-mvp-v2

## Implemented

- Migration 019 adds support_tickets with ticket code, customer owner, optional job link, subject, message, status, assignee, expected response time, and timestamps.
- Customer API: POST/GET /support/tickets and GET /support/tickets/:id. Customer identity comes from the verified Supabase Bearer token; an optional job link is checked against the same customer owner.
- Admin API: GET/PATCH /support/admin/tickets/:id protected by RoleGuard + Roles('admin'), which enforces Supabase staff role and MFA assurance.
- Customer History includes a ticket form and status list. Admin Dashboard includes the queue and allowed status transitions.
- RLS permits customers to select only their own tickets; writes and staff operations use the server-side backend path.

## Verification

- GitHub Actions #251 PASS on code head c455005: backend build/tests and frontend build/lint.
- Contract coverage asserts RLS, customer JWT, and Admin role boundaries.
- Two-account production RLS/MFA verification and a real support response channel remain unverified.
- Owner still must choose and operate the actual customer contact channel, support hours, and response SLA. The UI does not claim 24/7 or a response promise.
- No production data, credentials, secrets, reboot, shutdown, or logoff was used.

Unit tests also cover owned ticket creation, denial when linking another customer's Job, and invalid Admin status.

Admin UI now allows setting expected response time per ticket without introducing a default SLA. GitHub Actions #253 PASS on code head 1023268: backend build/tests and frontend build/lint.
