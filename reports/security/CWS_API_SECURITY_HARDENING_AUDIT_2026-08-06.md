# CWS API Security Hardening Audit — 2026-08-06

## Scope and evidence

Audited the current NestJS API, frontend API client, worker RPC boundary,
payment guards, upload/storage path, realtime ownership checks, DTO validation,
error filter, dependency tree and repository secret patterns. No production
mutation or secret access was performed.

Evidence from this run:

- Backend: **32 suites / 172 tests PASS**, build PASS.
- Frontend: **4 files / 9 tests PASS**, lint PASS, build PASS.
- Worker: **49 tests PASS**, Python compile PASS.
- `npm audit --omit=dev --audit-level=high`: **17 findings (5 high, 12 moderate)**.
  The available automatic fix is a breaking Nest 11 path; `--force` was not
  used.
- Repository working tree contains no match for the checked-in credential
  patterns (private keys, common cloud/live-token prefixes, or literal service
  role assignment). This is not a substitute for GitHub secret scanning/history
  review.

## Fixes applied

### BOLA/IDOR and payment state

- `POST /payments` and `POST /payments/:id/confirm` are now Admin AAL2-only.
  The customer MVP creates payment only through the server-side
  `JobsService.approve()` transition after `REVIEW_READY`.
- `GET /payments/:id` now requires either the authenticated owner of the linked
  `render_orders` row or a server-verified Admin AAL2 session. A different
  customer and anonymous caller receive a not-found response, avoiding payment
  existence disclosure.
- The frontend now sends the Supabase bearer token when refreshing payment
  details.

### Abuse and input bounds

- Added bounded per-instance `429` rate limiting for file upload, Drive resolve,
  job create/estimate and payment detail routes. Upload is capped at 5/minute
  per source IP in this MVP guard; `Retry-After` is returned.
- Added DTO length/size bounds for Drive URLs, storage references, filenames,
  notes, software metadata and input file sizes.
- Enabled `forbidNonWhitelisted: true` on the global validation pipe.
- Upload already uses disk-backed temporary streaming storage, a 2 GiB
  multipart limit, one-file/parts limits, timeout and cleanup; no memory-buffer
  fallback was introduced.

### SSRF/resource and response hardening

- Google Drive metadata fetch remains restricted to the Google Drive API URL
  built from an allowlisted file ID; API key is URL-encoded, redirects are
  rejected and the request has a 10-second abort timeout.
- Added API security headers: `X-Content-Type-Options`, frame denial,
  `Referrer-Policy`, `Permissions-Policy`, API CSP, HSTS and `Cache-Control:
  no-store`; Express `X-Powered-By` is disabled.

## Existing controls confirmed

- Explicit CORS origin parsing rejects wildcard production origins.
- Admin/Host routes require Supabase Bearer + `staff_roles` + `aal2` server-side.
- Worker RPC uses the per-worker identity/auth contract and negative tests.
- SePay HMAC/API-key guards fail closed; HMAC uses raw body, timestamp window and
  constant-time signature comparison. Payment notification transaction IDs are
  unique/idempotent and amount/storage/payment-code matching is server-side.
- Job ownership, realtime subscription ownership, download gating and payment
  ordering have regression coverage.
- Child process execution uses argument arrays/shell disabled in the audited
  scheduler/worker paths; uploaded files are kept in job-scoped temporary paths.

## Remaining findings / not verified

### P1 — dependency vulnerabilities

The installed tree reports 5 high and 12 moderate advisories involving the
Nest 10 dependency graph (`multer`, `ws`, `js-yaml`, `lodash`, `qs`, `uuid`,
`body-parser`). The automatic remediation requires a breaking Nest 11 upgrade.
No force upgrade was applied. A separate canary and runtime regression matrix
are still required.

### P1 — distributed rate-limit boundary

The new guard is intentionally in-process. Multi-instance Render/edge-wide
quotas still require platform/WAF or a shared limiter; no Redis was added
without staging evidence. The guard is baseline abuse protection, not a
capacity claim.

### NEEDS_VERIFICATION — external/runtime controls

Real Supabase RLS policy verification, B2 signed URL verification, authenticated
Google + TOTP AAL2 session, SePay live webhook, physical Worker identity and
production deployment of this commit were not performed in this session.

## Priority next actions

1. Run the isolated Nest 11 dependency canary and update only after full tests,
   build and staging regression pass.
2. Run authenticated staging tests against Supabase/RLS, B2 and two physical
   Workers.
3. Deploy this commit when the Vercel/Render deployment authority is available,
   then repeat read-only production probes and the one-job E2E gate.

## References

- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/editions/2023/en/0x03-introduction/
- Supabase API security and RLS guidance: https://supabase.com/docs/guides/api/securing-your-api
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
