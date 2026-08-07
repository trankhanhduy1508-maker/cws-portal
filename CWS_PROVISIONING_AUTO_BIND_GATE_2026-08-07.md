# CWS production Worker auto-bind gate — 2026-08-07

## Scope

Read-only verification of the canonical production Node Agent and Supabase
project `ynhxlxetwuiyejcjypsi` on host `MAY083`. No identity, credential, job,
payment, B2 object, or production row was created or changed.

## Runtime/database evidence

- `public.workers`: 29 rows.
- `public.worker_identities`: 0 rows.
- `public.worker_leases`: 0 rows.
- Workers with `last_seen_at > now() - interval '2 minutes'`: 0.
- `public.workers` has no hostname, serial, or device-fingerprint field that
  can securely map a physical host to a row.
- The canonical launcher reaches fail-closed validation when `CWS_BACKEND_URL`
  is absent; it does not emit a heartbeat without authenticated configuration.

## Contract verification

The production path requires an explicit `CWS_WORKER_ID` and a per-worker
credential loaded from a Windows DPAPI store. The backend stores only the
credential hash and authenticates worker RPC with the existing HMAC/timestamp/
nonce contract.

The legacy `register_worker` RPC accepts a caller-supplied ID. It is not a
secure host identity mechanism and is not exposed by the authenticated
production Worker gateway. Re-enabling it, deriving an ID from `MAY083`, or
choosing one of the 29 offline IDs would permit worker impersonation.

## Decision

Automatic first-run registration cannot be implemented safely from the current
schema and trust boundary without an approved bootstrap trust anchor. A safe
future enrollment contract must authenticate the machine or a one-time Owner-
issued enrollment credential before issuing the per-worker credential; it must
not use hostname, GPU, `worker_id`, or a fleet-wide secret as proof.

## Status

- MAY083 identity binding: **BLOCKED / NOT VERIFIED**.
- MAY083 heartbeat in Supabase: **NOT VERIFIED**.
- B2 credential provisioning: **BLOCKED** because the Worker identity gate is
  closed and no scoped B2 runtime secret is present locally.
- Production B2-only E2E: **BLOCKED before authentication**.

## Exact external gate

Approve and provide one secure bootstrap/provisioning trust anchor for MAY083,
or explicitly provision one existing `workers.worker_id` and its per-worker
credential through the approved identity process. The credential must be
written to the Windows DPAPI store and only its hash inserted into
`public.worker_identities`; it must never be committed or logged. After this
gate, configure the scoped B2 runtime values and run the canonical Node Agent.

