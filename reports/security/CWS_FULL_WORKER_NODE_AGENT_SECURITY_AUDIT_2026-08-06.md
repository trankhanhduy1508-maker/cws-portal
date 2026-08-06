# CWS Full Worker / Node Agent / Security Audit — 2026-08-06

## Scope and evidence boundary

Audited the canonical `main` tree at commit `d029e3c`, including the Worker
state machine, generic Worker Engine, staging adapters, Windows SCM PoC,
Job Object wrapper, path boundary, Worker migrations/RPCs, backend guards,
Jobs/Storage/Payment code, frontend Admin/Customer wiring, and the latest
Worker/Security reports. No production mutation, credential use, or physical
Worker action was performed.

## Findings and actions

### P0 — production Worker identity/authentication is not closed

The Worker RPC contract still authenticates by caller-supplied `worker_id` in
the repository's legacy/staging SQL surface. `worker_migrations/019` revokes
client-role execution for internal RPCs, but the repository deliberately does
not yet provide a production Worker credential/signature/session contract.
That means production Worker publishable-RPC identity remains a rollout gate,
not a PASS. Do not enable a production rollout or treat a known worker ID as
an authenticator.

The staging assignment migration also grants
`claim_next_staging_job(text, integer)` to `anon`/`authenticated`; this is
acceptable only for an isolated staging project with no production data. It
must not be applied to production without a separately approved Worker
authentication contract.

### P0 — hostile `.blend` isolation remains incomplete

The generic engine disables customer autoexec, validates JobSpec IDs and
capability requirements, uses per-task workspaces, validates output, and can
attach Blender to a Windows Job Object. This is process-tree containment, not
a complete filesystem/network sandbox. Job Object ownership, reparse-point
rejection and output integrity therefore remain partial controls; hostile
Blend execution on a disposable Windows isolation boundary is still
UNVERIFIED/BLOCKED.

### P1 — fixed in this audit: staging downloader SSRF/redirect surface

`worker/staging_e2e.py` previously accepted both HTTP and HTTPS and allowed
the default URL opener to follow redirects. It now requires HTTPS, rejects
URL credentials/custom ports, requires `CWS_STAGING_PROJECT_HOSTS`, checks
the hostname against that explicit allowlist, and disables redirects. A
policy violation remains permanent rather than being misclassified as a
retryable network error.

### P1 — Windows service / GPU boundary

The SCM host is intentionally a staging PoC. It does not launch Blender by
default; the optional helper is an explicit local configuration and uses
`shell=False`. The service/user-session GPU split, service identity/ACLs,
duplicate-instance lock, update/rollback, and real GPU lifecycle remain
runtime gates. No service running as SYSTEM was enabled or changed.

### P1 — heartbeat/retry/process cleanup

Node Agent state transitions, single-flight non-blocking heartbeat, bounded
retry jitter, lease-generation fencing hooks, timeout cleanup and Job Object
close behavior are covered by existing code/unit or staging evidence. The
non-blocking heartbeat cannot forcibly terminate a hung callback; production
adapters must retain bounded network timeouts. This is documented as an
operational contract, not claimed as full runtime PASS.

### P1 — storage, output, payment and API authorization

The audit found existing coverage for path boundaries, output identity and
SHA-256 verification, B2 signed URL TTL/download gating, payment ordering,
webhook authenticity/replay/idempotency, customer ownership and Admin AAL2
RoleGuard. B2 production key rotation and live payment remain external gates.
The backend service-role client is server-only; no frontend service-role key
was found in the audited tree.

### P1 — dependency/security update gate remains open

`npm audit --omit=dev --audit-level=high` on the current backend reports 17
production vulnerabilities: 5 high, 12 moderate, 0 critical. The available
automated remediation upgrades Nest/platform packages across a breaking
version boundary, so `npm audit fix --force` was not run. This remains a
separate Nest canary/upgrade task; it is not safe to claim production security
PASS from the current dependency tree.

## Failure-mode checklist

| Failure mode | Current handling | Classification | Required next evidence |
|---|---|---|---|
| Duplicate Worker instance | State machine prevents duplicate launch in one process; cross-process lock absent | NEEDS_VERIFICATION | Physical Windows multi-instance test |
| Network loss / slow heartbeat | Single-flight dispatch; adapter timeouts; retry/jitter | CODE/UNIT VERIFIED | Live lease loss/reconnect test |
| Stale lease / worker crash | Generation fencing, stale requeue and recovery hooks | STAGING VERIFIED / production pending | Production Worker identity contract |
| Blender timeout/orphan | timeout cleanup, Job Object opt-in, taskkill fallback | PARTIAL | Live Windows hostile/render test |
| GPU TDR / VRAM OOM / driver mismatch | capability preflight and retry classification | CODE VERIFIED | Real GPU matrix |
| Path traversal/reparse point | safe IDs, root checks, reparse rejection | CODE/UNIT VERIFIED | Junction/reparse disposable-host matrix |
| Partial/corrupt output | PNG structural validation, byte/hash checkpoint verification | CODE/UNIT VERIFIED | B2 production object verification |
| SSRF/redirect in staging source | HTTPS + explicit host allowlist + no redirect (fixed here) | CODE/UNIT VERIFIED | Staging host-config smoke test |
| Worker RPC impersonation | Worker ID remains insufficient by itself | P0 BLOCKED | Founder-approved device identity/secret/session |
| Admin CRM/Fleet access | Role + AAL2 server-side guard; anonymous runtime 401 | CODE + HTTP VERIFIED | Real Google/TOTP session |
| Webhook replay/duplicate/wrong amount | HMAC/API-key guard, timestamp, idempotent payment logic | CODE/UNIT VERIFIED | Live SePay transaction |
| B2 key over-privilege/rotation | scoped-key design documented; current rotation external | BLOCKED | Founder rotates key in B2/Render |
| Service Session 0/GPU | service PoC keeps GPU helper separate | UNVERIFIED | Physical Windows service/user-session test |

## External sources consulted

- Microsoft Job Objects and `AssignProcessToJobObject`: process-tree
  containment, same-session constraints, nested-job/breakaway edge cases,
  and `KILL_ON_JOB_CLOSE` behavior:
  [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects),
  [AssignProcessToJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-assignprocesstojobobject).
- Supabase MFA/AAL2 and server-side enforcement:
  [MFA](https://supabase.com/docs/guides/auth/auth-mfa),
  [Securing data](https://supabase.com/docs/guides/database/secure-data).
- OWASP API object authorization/injection and ASVS API controls:
  [OWASP API Security](https://owasp.org/API-Security/),
  [ASVS](https://owasp.org/www-project-application-security-verification-standard/).
- Node child-process shell/argument behavior:
  [Node.js child_process](https://nodejs.org/api/child_process.html).
- NVIDIA telemetry/power/process visibility boundary:
  [NVML](https://developer.nvidia.com/management-library-nvml).
- Backblaze B2 scoped application keys and presigned URLs:
  [Application keys](https://www.backblaze.com/docs/en/cloud-storage-application-keys),
  [S3-compatible API](https://www.backblaze.com/docs/cloud-storage-s3-compatible-api).
- Render environment/deploy behavior and secret deploy hooks:
  [Environment variables](https://render.com/docs/configure-environment-variables),
  [Deploy hooks](https://render.com/docs/deploy-hooks).
- Vercel connected-Git production deployment behavior:
  [Deploying Git repositories](https://vercel.com/docs/git).

## Verification performed

- Worker offline suite: **38/38 PASS** with Python 3.12.7 runtime.
- New staging downloader security tests cover HTTP/private-host rejection,
  host allowlist, credentials/custom-port rejection, and redirect rejection.
- Backend: **141/141 PASS**, lint and build PASS.
- Frontend: **9/9 PASS**, lint and build PASS.
- Dependency check: **17 production vulnerabilities** (5 high, 12 moderate,
  0 critical); no breaking-force upgrade was applied.
- Read-only production probe: `/health=200`; canonical CORS preflight
  `204` with `Access-Control-Allow-Origin: https://cws-portal.vercel.app`;
  `/fleet/workers`, `/customers/crm`, `/payments/reconciliation-anomalies`,
  and `/staff/mfa-status` return `401` without credentials. One earlier
  combined probe timed out during cold start; a dedicated `/health` retry
  returned 200, so no timeout is claimed as a security PASS or regression.

## Founder-only gates

1. Approve and provision a real Worker identity/authentication contract, then
   apply production RPC privilege hardening through the production change
   process.
2. Run hostile `.blend`, Windows SCM/user-session GPU, duplicate-instance,
   junction/reparse, crash/recovery and real multi-node tests on a disposable
   physical Windows staging host.
3. Rotate/verify scoped B2 and live payment credentials, then run the real
   customer E2E transaction.

## Conclusion

Worker, Node Agent and Security are **PARTIAL / NO-GO for production rollout**.
The safe code-level P1 SSRF/redirect issue in the staging harness is fixed and
verified. Remaining P0/P1 rollout gates require identity credentials,
physical Windows/GPU isolation, or real payment/storage operations.

## Identity contract follow-up — 2026-08-06

The production Worker identity/RPC contract is now prepared in code/unit
scope: per-worker credential hash, HMAC request proof, timestamp/nonce replay
cache, DPAPI client store and a backend allowlisted RPC gateway. Negative tests
cover impersonation, body tampering, stale/expired/revoked credentials,
duplicate nonce and worker-id injection.

This is not production runtime verification. Migration 020, credential
provisioning, Windows account/ACL setup and live heartbeat/claim/revocation
tests remain Founder approval/runtime gates.
