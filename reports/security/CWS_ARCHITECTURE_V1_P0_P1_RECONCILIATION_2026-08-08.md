# CWS Architecture V1 P0/P1 reconciliation — 2026-08-08

## Outcome

Three production control-plane defects were fixed without adding infrastructure
or changing the Worker identity/storage-capability model.

## Findings and fixes

1. `POST /files/upload` was rate-limited but unauthenticated, and `POST /jobs`
   accepted a caller-provided B2 `fileRef` without durable ownership proof.
   Backend now requires Supabase customer authentication on both routes,
   records `object_key -> customer_id`, and checks that mapping before dispatch.
2. Resilient claim matched VRAM but not input transport. A Worker without a
   Google Drive API capability could claim historical Drive work. The new
   three-argument claim accepts only the strict `b2`/`google_drive` allowlist
   and filters inside the existing atomic `FOR UPDATE SKIP LOCKED` query.
3. Production catalog inspection found 22 internal `SECURITY DEFINER` fleet
   functions executable by `anon/authenticated`, including job creation,
   incident reporting, stale-worker mutation and attempt finalization. The
   gateway hardening migration revokes direct execution and preserves only
   `service_role`/database-owner operation.

## Production schema evidence

- Project: canonical Supabase `ynhxlxetwuiyejcjypsi`.
- Preflight: PostgreSQL 17.6; required job/task tables present; 0 existing B2
  render orders and 0 queued B2 tasks; both new objects absent before apply.
- Applied migrations: `input_upload_ownership`,
  `worker_input_capability_claim`, `internal_rpc_gateway_hardening`.
- `input_uploads`: RLS enabled; `anon_select=false`,
  `authenticated_select=false`, `service_select=true`.
- Capability claim: `anon_execute=false`, `authenticated_execute=false`,
  `service_execute=true`.
- Post-hardening catalog query: zero public-schema `SECURITY DEFINER`
  functions executable by `anon` or `authenticated`.

## Verification

- Backend: 37 suites / 190 tests PASS; build PASS.
- Worker: 78/78 tests PASS.
- Frontend: 13/13 tests PASS; lint PASS; build PASS.
- Negative coverage includes wrong upload owner, unavailable ownership store,
  missing/duplicate/unknown Worker input schemes and B2-only claim payload.

## Architecture/scale review

- Manual action per Worker: unchanged bounded identity enrollment; no B2 key.
- Manual action per Job: none.
- Secret on Worker: only its DPAPI-protected per-Worker HMAC credential.
- Compromised Worker: cannot choose an unrelated input key or call internal
  Supabase Worker RPCs directly; current lease/generation and exact-object
  120-second storage capabilities remain the blast-radius boundary.
- Worker 101/1001 uses the same claim payload and ownership contract.
- No Redis, broker, microservice, project or bucket was added.

## Remaining gate

Application deployment and a real authenticated customer upload are still
required before P3 runtime. No Blender/B2 completion PASS is claimed here.
