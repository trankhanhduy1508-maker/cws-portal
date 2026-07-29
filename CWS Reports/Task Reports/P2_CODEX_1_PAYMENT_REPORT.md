# P2 CODEX 1 — Payment Report

## Roadmap
Đã đọc đầy đủ `public/CWS_FULL_ROADMAP_OFFICIAL_V1_1.md`. Scope: P2.4–P2.6 và payment gate liên quan.

## Branch
`agent-1-payment-p2`

## Commit
Current GitHub branch HEAD is recorded in the session result. Commit message: `fix(p2): secure payment authorization`.

## Agents
- Payment Repository Analyst: COMPLETE.
- Payment Security & QA Reviewer: COMPLETE baseline; final diff review requested.

## Files Changed
Payment domain/controller/service/repository/config, JWT/admin guards, jobs payment gate wiring, migration 004, Vietnam payment UI constants, placeholder-only env example, tests, and this report.

## API Changed
- `POST /payments`: authenticated customer; server derives expected amount.
- `GET /payments/:id`: owner/admin only.
- `POST /payments/:id/evidence`: owner submits manual-payment evidence.
- `POST /payments/:id/confirm|reject|refund`: admin-only; idempotency key required.
- Job creation is authenticated and validates/consumes an owned confirmed payment before dispatch.

## Migration
`backend/migrations/004_secure_manual_payments.sql` adds ownership, reference, expiry, mismatch/refund states, append-only events, atomic transition/consume RPCs, and unique duplicate protection.

## Authorization and Ownership
JWT payload establishes a trusted subject and server-side admin role. Customer confirmation is removed. Payment reads/evidence require ownership; admin actions require AdminRoleGuard.

## Audit
`payment_events` is append-only. State transitions and payment-to-order consumption are audited with unique idempotency keys.

## Payment State
Manual MB Bank/VietQR and Manual MoMo only. No automatic confirmation. Exact amount becomes CONFIRMED; mismatch becomes UNDERPAID/OVERPAID. Reject/refund states are explicit.

## Tests
- Build: BLOCKED / NOT RUN — Windows local execution backend unavailable.
- Lint: BLOCKED / NOT RUN — Windows local execution backend unavailable.
- Unit: BLOCKED / NOT RUN — Windows local execution backend unavailable.
- Integration/security: BLOCKED / NOT RUN — Windows local execution backend unavailable.
No PASS claim is made. A pure quote unit test was added but not executed.

## GitHub Actions
No workflow result was available at report creation time.

## Push
GitHub Only Mode writes this commit directly to `agent-1-payment-p2`. No merge/deploy/force-push.

## Credential Incident
The credential-shaped values in `backend/.env.example` were replaced with placeholders. Supabase service-role and B2 credentials must be revoked/rotated immediately; history purge requires separately approved incident handling.

## Blockers / Remaining Work
- Canonical Customer/Order/Project/Quote models remain incomplete; the patch binds payment ownership to JWT subject and atomically binds a confirmed payment to the generated render order.
- Full frontend login/session and admin payment-review console remain required.
- Existing historical credentials remain in Git history until an approved purge.
- Build/lint/unit/integration/security suites require an available runner.

## Next Step
Run migration in staging, execute the complete auth/idempotency/mismatch/refund/job-bypass test matrix, then implement the admin manual-payment review UI.


## Final QA Review
Final QA found and the leader corrected: a syntax error in JobsService, missing customer ownership on jobs, consume-before-order ordering, idempotency race re-check, legacy migration constraint failure, missing creation audit, and malformed note/amount validation. Remaining canonical quote/upload verification and executable security-test coverage keep overall status PARTIAL, not COMPLETE.
