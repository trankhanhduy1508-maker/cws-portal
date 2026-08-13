# CWS API Security Hardening Research — 2026-08-13

> Status: Founder-approved research baseline for immediate implementation planning.  
> Scope: API authorization, secrets, cross-customer isolation, observability, backup/restore, payment integrity, AI-change containment, and hostile render-workload boundaries.  
> Canonical architecture remains `CWS_SECURITY_ARCHITECTURE_V1.md`; this file is research/evidence and does not silently replace product workflow or architecture.

## Executive conclusion

CWS must treat API security as a production release gate, not a UI property. Hiding buttons or routes in the frontend is never authorization. Every sensitive operation is authorized server-side, customer ownership is enforced at object level, secrets never enter frontend/repo/logs, payment authority remains server-side, and production changes require automated evidence.

CWS already has a strong Zero-Trust/fail-closed security architecture. The immediate hardening work is to turn that architecture into repeatable automated gates around the real API surface.

## Authoritative references reviewed

- OWASP API Security Top 10 2023: API1 Broken Object Level Authorization, API2 Broken Authentication, API3 Broken Object Property Level Authorization, API4 Unrestricted Resource Consumption, API5 Broken Function Level Authorization, API6 Unrestricted Access to Sensitive Business Flows, API7 SSRF, API8 Security Misconfiguration, API9 Improper Inventory Management, API10 Unsafe Consumption of APIs.
- GitHub Secret Scanning / Push Protection: hard-coded credentials should be detected and blocked before reaching repository history.
- Supabase Auth + Row Level Security: exposed tables require RLS; authorization must restrict rows/resources to the authenticated user; service-role/bypass-RLS credentials must never reach the browser.
- Vercel Sensitive Environment Variables: production/preview secrets should be stored outside source and marked sensitive where supported.

## Eight mandatory CWS security gates

### Gate 1 — Secrets and credential exposure

Requirements:

- no API keys, passwords, Supabase service-role, B2 master/application secrets, SePay/webhook secrets, Worker root credentials, session tokens, OAuth tokens or private keys committed to source;
- no secret value in customer-visible frontend bundles, logs, Telegram messages, screenshots/reports, prompts, command lines where avoidable, or build artifacts;
- runtime secrets come from approved environment/secret stores only;
- Vercel production/preview credentials should use Sensitive Environment Variables where supported;
- suspected or historical exposure is treated as compromise until rotation/revocation is verified;
- enable/verify GitHub secret scanning and push protection where the repository/account supports it;
- local/CI secret scanning must fail the release gate on confirmed secret exposure.

Release assertion: `SECRET_EXPOSURE = NO`.

### Gate 2 — Server-side authentication and authorization

Requirements:

- frontend visibility/hidden buttons are never authorization controls;
- every sensitive endpoint verifies a valid identity/token at the server boundary;
- authorization is deny-by-default;
- admin/host functions require explicit staff authorization and required AAL2 where canonical policy requires it;
- customer runtime remains separate from admin authentication;
- no endpoint trusts client-supplied ownership, CLEAN, INPUT_SAFE, PAID, role, price, Worker authority, or privileged state;
- object identifiers supplied by clients are always rebound to authoritative ownership/server state before read/update/action.

Release assertion: `SERVER_AUTHZ_COVERAGE = PASS`.

### Gate 3 — Cross-customer object isolation / BOLA

Automated two-account tests are mandatory for customer-owned resources.

For Customer A and Customer B, verify B cannot use A's identifiers to read or mutate:

- submissions/input metadata;
- Jobs/render orders;
- Tasks/progress where customer-visible;
- previews;
- output/download capability;
- payment/order state;
- customer profile/history;
- Drive-derived/canonical input metadata.

Equivalent reverse-direction tests are required where practical. UUIDs are not security controls.

Supabase exposed tables must have verified grants/RLS consistent with ownership. Server-side service-role usage must still enforce application ownership before returning data.

Release assertion: `CROSS_CUSTOMER_ISOLATION = PASS`.

### Gate 4 — Observability and auditability

A production failure must be reconstructable without requiring the Founder to manually guess what happened.

Required correlation chain where practical:

`request_id/submission_id -> authenticated customer -> /drive/resolve or upload -> quarantine/security verdict -> canonical B2 -> INPUT_SAFE -> Job -> Task -> Worker -> output -> payment -> delivery`

Requirements:

- sanitized structured logs;
- stable correlation/request IDs propagated through material stages;
- explicit start/end/error category and elapsed time for long-running ingress/security stages;
- no secret/token/customer file content in logs;
- error tracking/runtime evidence must distinguish code verification from production evidence;
- log retention must be sufficient for realistic incident/debug windows, or events must be exported to an approved observable store before retention expires.

Release assertion: `SECURITY_OBSERVABILITY = PASS` for critical path.

### Gate 5 — Backup is not proven until restore is proven

Requirements:

- identify authoritative data that must be recoverable: database schema/state, auth-linked customer/business records, Job/Task/payment state, configuration metadata as applicable;
- know which storage is outside database backup scope (for example B2 objects and Supabase Storage objects if used);
- define backup ownership and retention;
- perform a non-production restore drill before declaring backup readiness;
- verify restored schema, representative relational integrity, critical security policies/RLS, and application compatibility;
- record recovery evidence and measured RPO/RTO; do not claim values that were not measured.

Release assertion before broader production scale: `RESTORE_DRILL = PASS`.

### Gate 6 — Payment integrity and business-flow protection

Requirements:

- frontend never decides authoritative price, PAID status, payment amount, unlock state, or download authorization;
- final price is calculated/validated server-side from canonical business rules and verified runtime/cost evidence;
- SePay/payment webhook authentication/verification is fail-closed;
- exact amount + exact unique payment reference/content must match before PAID;
- webhook/event processing is idempotent and replay-safe;
- duplicate/replayed webhook must not duplicate fulfillment/unlock;
- customer cannot alter another customer's payment/order identifiers;
- download capability is narrow, server-authorized and issued only after authoritative PAID.

Release assertion: `PAYMENT_TRUST_BOUNDARY = PASS`.

### Gate 7 — AI-generated change containment and regression safety

AI speed does not waive change control.

Requirements:

- Codex does not silently deploy unreviewed security-sensitive changes;
- every material change remains inside Harness + Spec Kit + Founder-controlled boundaries;
- auth/payment/storage/security/Worker boundary changes receive focused security review;
- tests must cover the failure mode fixed, not only happy path;
- Browser/Playwright/Bruno/backend tests are selected by affected boundary;
- production verification follows merge/deploy for security-critical fixes;
- material incidents/fixes update Engineering Learning Log;
- no mutation of production data merely to make a test pass.

Release assertion: `SECURITY_CHANGE_GATE = PASS`.

### Gate 8 — Hostile render workload boundary

Customer files are potentially hostile code/data, not ordinary uploads.

Requirements remain consistent with `CWS_SECURITY_ARCHITECTURE_V1.md`:

- temporary quarantine before canonical B2;
- provider/URL/SSRF controls;
- extension + actual signature/content checks;
- anti-malware fail-closed;
- bounded archive traversal/bomb/resource protections;
- Blender Python autoexec OFF for untrusted projects;
- immutable canonical original + working copy;
- Worker receives no Supabase service-role/B2 master/root secret;
- task-scoped least privilege and cleanup;
- host execution/isolation gap remains a production-security concern until verified with real runtime evidence.

Release assertion: `HOSTILE_WORKLOAD_BOUNDARY = PASS` before declaring hostile-input production security complete.

## API-specific controls to implement/verify now

1. Inventory customer/admin/worker/payment endpoints and classify each as public, authenticated-customer, staff/AAL2, worker, webhook, or internal.
2. For every endpoint that accepts an object ID, prove object-level authorization against authoritative ownership.
3. For every request DTO/body, allowlist mutable fields; reject/ignore privileged properties such as owner, role, state, CLEAN, INPUT_SAFE, PAID, price, cost, worker_id, lease/generation or equivalent authority unless set by the server.
4. Apply bounded request/body/remote-fetch limits and timeouts appropriate to endpoint semantics; expensive Drive acquisition and security scanning need resource bounds and observable duration.
5. Preserve SSRF fail-closed behavior for Drive acquisition and redirect revalidation.
6. Verify CORS production allowlist remains explicit and fail-closed.
7. Verify sensitive errors do not leak stack traces, credentials, internal URLs, SQL, secret values or third-party tokens to customers.
8. Verify rate/replay/idempotency defenses for sensitive business flows: submission, exactly-one Job creation, payment webhook, Worker claim/enrollment and any capability issuance.
9. Verify exposed Supabase tables/views/functions/RPCs use grants/RLS/EXECUTE privileges appropriate to their role; SECURITY DEFINER functions require explicit privilege/search_path review.
10. Verify all frontend configuration prefixed/exposed to the browser is intentionally public; no server secret may be moved into a public env namespace.

## Immediate P0 implementation order

P0-A — Secret exposure audit + current-tree/history/deployment-artifact review; produce rotation list without printing values.

P0-B — API endpoint authorization inventory and automated BOLA/cross-customer tests using two controlled accounts.

P0-C — Supabase grants/RLS/RPC privilege verification for production-relevant customer/admin/worker paths; read-only evidence first, migrations only through approved reviewed process.

P0-D — Payment trust-boundary regression tests: server-calculated authority, webhook verification, exact amount/reference, replay/idempotency, cross-customer isolation.

P0-E — Critical-path correlation/structured observability so future `/drive/resolve` and Job failures can be diagnosed from retained evidence.

P0-F — Turn all confirmed findings into focused regression gates. Do not start unrelated security projects while a P0 finding is unresolved.

## Existing evidence that must not be forgotten

The 2026-08-05 security audit already found/recorded:

- historical embedded Supabase/B2 credentials were removed from current runtime source but rotation remained required;
- staging admin RPC EXECUTE/search_path hardening was verified, while production apply was not authorized by that audit;
- backend dependency audit still had unresolved High findings requiring tested major-version canary work;
- hostile `.blend` host isolation remained unverified;
- production rollout was NO-GO at that evidence point.

These items must be re-grounded against current Git/runtime before being called fixed; historical audit status is not current production proof.

## What this research does NOT authorize

- disabling security checks for speed;
- exposing new admin/worker/public APIs;
- new infrastructure or storage services;
- destructive production migration;
- automatic credential rotation without verifying dependencies/rollback;
- copying live secrets into GitHub, ChatGPT, Codex prompts, reports or Telegram;
- claiming production security from unit tests alone.

## Success definition

CWS API security hardening is not complete because a scan says "no issue". It is complete for the covered boundary only when the real implementation and automated tests prove:

- no current secret exposure;
- server-side authz on sensitive endpoints;
- Customer A/B isolation;
- fail-closed ingress/security;
- payment authority cannot be forged by client/replay;
- critical failures are observable;
- AI changes are regression-tested/reviewed;
- hostile workload authority remains bounded;
- and production evidence matches the deployed commit.
