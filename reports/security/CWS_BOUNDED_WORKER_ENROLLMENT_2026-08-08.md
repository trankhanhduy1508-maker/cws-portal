# CWS bounded Worker enrollment — 2026-08-08

## Outcome

Architecture V1 no longer requires SQL edits for every new Worker. An Admin
session authenticated with Supabase Google OAuth plus TOTP/AAL2 can issue a
batch of 1–100 short-lived tickets through Backend. Each ticket is random,
one-time, expires in at most 60 minutes and is bound to one stable Worker ID.

The Windows installer generates the final per-Worker credential locally,
stores it with same-user DPAPI and sends only its SHA-256 verifier to Backend.
Backend consumes the ticket and creates the registry/identity atomically.
Lost-response retries are accepted only for the same ticket, Worker ID and
credential hash. A different replay, expired ticket, wrong Worker ID or an
attempt to overwrite an existing identity is rejected.

## Security boundary

- Secret on an enrolled Worker: one independently revocable Worker credential.
- Not on a Worker: Supabase service role, Admin token, B2 account/application
  key, another Worker's credential or a fleet enrollment secret.
- Compromise scope: the current Worker identity and its current fenced task's
  short-lived exact-object storage capabilities; no fleet-wide authority.
- Manual work per job: none.
- Manual database edit per Worker: none.
- Worker 2–100: one Admin AAL2 batch plus the same ticket-based installer;
  `issue_worker_enrollment_batch.ps1` supports 100 IDs in one invocation.
- Scale boundary: Backend performs one ticket insert and one atomic enrollment
  transaction per host. Normal heartbeat/claim does not touch the ticket table.

## Production migration evidence

Migration `026_bounded_worker_enrollment.sql` was applied to canonical project
`ynhxlxetwuiyejcjypsi`. Catalog verification returned:

- RLS enabled on `worker_enrollment_tickets`;
- `anon_select=false`, `authenticated_select=false`, `service_select=true`;
- `anon_execute=false`, `authenticated_execute=false`,
  `service_execute=true` for `consume_worker_enrollment`;
- `workers.hostname` exists;
- zero real tickets were issued and the existing MAY083 identity count stayed
  one.

A production transaction test created only rollback-scoped data and verified:
first consume succeeds, retry with the same credential succeeds, replay with a
different credential fails, and the identity hash is unchanged. The
transaction was rolled back; no test Worker or ticket remains.

The Supabase advisor reports `RLS enabled/no policy` as INFO for the ticket
table. This is intentional: the table is service-role-only and must not receive
an anon/authenticated policy.

## Verification

- Backend: 38 suites / 195 tests PASS; Nest build PASS.
- Enrollment service: issuance/hash-only storage, malformed/duplicate batch,
  atomic redemption and fail-closed negative tests PASS.
- Worker: 85 tests PASS, including HTTPS-only redeem, no plaintext final
  credential in request, bounded batch inventory and migration privilege
  assertions.
- 100 deterministic Worker IDs spread startup heartbeat/claim over the
  configured five-second window; no coordinator or new infrastructure is used.

## Runtime boundary

CODE/UNIT/PRODUCTION-SCHEMA VERIFIED. A fresh second physical host has not yet
redeemed a real ticket, so multi-host enrollment is not PHYSICAL-E2E-VERIFIED.
P3 Blender/B2 completion remains blocked on a real authenticated customer B2
upload/task; no fake job was created for this report.
