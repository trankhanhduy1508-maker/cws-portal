# CWS Worker Production Identity/RPC Authentication Contract — 2026-08-06

## Recommended MVP contract

Use one random, high-entropy bearer credential per Worker, combined with a
request signature. The credential is not the `worker_id` and is never stored
in plaintext in Supabase.

| Question | Contract |
|---|---|
| Identity | Pre-provisioned `workers.worker_id`, mapped 1:1 to `worker_identities.worker_id`. It is an identifier only. |
| Credential | One random 32-byte base64url token per Worker. Backend stores only SHA-256(token). |
| Windows storage | User-scoped DPAPI ciphertext at the Worker credential path, readable only by the dedicated least-privilege Worker account. |
| Transport | HTTPS to CWS Backend only; no direct production publishable-key RPC. |
| Proof | `Authorization: Worker <token>` plus worker id, epoch-seconds timestamp, unique nonce, and HMAC-SHA256 signature. |
| Canonical input | `worker_id`, timestamp, nonce, uppercase method, URL path, and SHA-256(raw body), joined with newlines. |
| Replay defense | Backend accepts only a small clock window and atomically inserts `(worker_id, nonce)` into `worker_auth_nonces`; duplicate nonce is rejected. |
| Backend verification | Verify proof, look up active identity, constant-time compare SHA-256(token), enforce expiry/revocation, consume nonce, then call an allowlisted Supabase RPC with the authenticated worker id injected server-side. |
| Rotation/revocation | Replace the hash and set a new expiry for rotation; set `status=revoked`/`revoked_at` immediately for compromise. No production credential is committed. |
| Blast radius | A stolen Worker token authenticates only that Worker and can be revoked independently; it is not a fleet-wide secret. |

Default credential lifetime is 90 days after Founder approval. Emergency
revocation is immediate. Rotation may use a short maintenance window because
the MVP keeps one active credential per Worker rather than adding overlapping
key versions.

## RPC boundary

The new `/worker/rpc/:operation` backend gateway is protected by
`WorkerAuthGuard` and accepts only:

- `worker_ping`
- `claim_next_task`
- `report_heartbeat`
- `complete_task`
- `fail_task`
- `update_task_stage`
- `report_worker_state_transition`

The gateway overwrites any caller-supplied `p_worker_id` with the authenticated
identity and rejects self-registration, unknown operation names or malformed
task/generation arguments. Worker rows/fleet/capabilities are provisioned out
of band; a Worker cannot self-report elevated capability through production
RPC. Existing legacy/staging Supabase publishable RPC access remains a
staging-only path and must not be enabled for production.

## Threat decisions

- Worker impersonation: a known id alone is insufficient; the token hash and
  HMAC proof must match the same identity.
- Replay: timestamp, nonce uniqueness and request-body binding prevent replay
  of a captured signed request.
- Tampering: path, method and raw body hash are signed.
- Revocation/expiry: checked server-side on every request.
- Secret leakage: no token/signature is included in errors, logs or reports;
  code paths expose only the Worker id and operation for diagnostics.
- Local compromise: DPAPI is user-scoped and the Worker account must not run as
  `SYSTEM`; Windows service ACLs remain a Founder/runtime verification gate.

## Implementation completed

- `backend/src/worker-auth/*`: contract, guard, identity verification,
  nonce replay cache and allowlisted RPC gateway.
- `worker/worker_rpc_auth.py`: signed HTTPS RPC client.
- `worker/windows_credential_store.py`: Windows DPAPI-backed credential file
  store; the installer still owns directory ACL setup.
- `worker_migrations/020_worker_identity_rpc_auth_contract.sql`: identity and
  nonce tables with RLS enabled and client-role access revoked.
- Negative tests cover impersonation, body tampering, stale timestamp, revoked
  identity, expired identity, duplicate nonce, arbitrary RPC name, worker-id
  injection and HTTP transport rejection.

## Founder review/provisioning gates

1. Approve migration `020` and production backend gateway deployment.
2. For each physical Worker, create/register the Worker row and one random
   credential hash through a trusted provisioning procedure; never paste the
   plaintext token into chat, Git, or logs.
3. Install the token into the dedicated Worker account's DPAPI store and apply
   Windows ACLs; do not run the GPU helper as `SYSTEM`.
4. Run one real heartbeat, claim, lease-heartbeat, revoke, expiry and rotation
   smoke matrix on isolated staging before production enablement.

## Sources checked

- Microsoft DPAPI: https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata
- Microsoft password/credential handling: https://learn.microsoft.com/en-us/windows/win32/secbp/handling-passwords
- OWASP API Security Top 10: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- Supabase secure data/RLS: https://supabase.com/docs/guides/database/secure-data
- Supabase API security/grants: https://supabase.com/docs/guides/api/securing-your-api

## Evidence boundary

The implementation is code/unit verified only. Migration application, actual
credential provisioning, Windows DPAPI/service ACL behavior and live Worker
RPC/heartbeat are intentionally not claimed as runtime PASS.
