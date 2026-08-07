# CWS production Worker auto-register/auto-bind audit — 2026-08-07

## Scope

Read-only audit of the canonical Node Agent, worker migrations and production
Supabase project `ynhxlxetwuiyejcjypsi`. No Worker identity, job, payment,
storage object or production configuration was created or changed.

## Evidence

- Host running the package: `MAY083`.
- `public.workers`: 29 rows; all observed rows are `offline`.
- `public.workers` has `boot_id` and `session_id` columns, but all 29 observed
  rows have both values `NULL`; `agent_version` and `worker_version` are also
  `NULL`.
- `public.workers` has no hostname, machine name, serial or device-fingerprint
  column. No observed `worker_id` contains `MAY083`.
- `public.worker_identities`: 0 rows. `public.worker_leases`: 0 rows.
- No production `worker_identities` row can authenticate this host; therefore
  there is no valid heartbeat or lease evidence for MAY083.
- Existing RPCs are `register_worker(text,bigint,text,integer)` and
  `worker_ping(text)`. Their signatures accept a caller-supplied `worker_id`
  only; they do not derive or verify a host identity.
- Canonical `worker/production_node_agent.py` requires `CWS_WORKER_ID` and a
  DPAPI credential before it starts. It calls authenticated `worker_ping`; it
  does not call `register_worker`.
- Git history shows the same explicit `CWS_WORKER_ID` requirement in the
  initial production Node Agent. The only registration implementation is the
  legacy helper, which passed an explicit ID and fleet ID; it was not an
  automatic machine binding mechanism.

## Conclusion

MAY083 cannot be mapped to an existing production Worker record from current
database evidence. Selecting any of the 29 offline IDs would be an
unverifiable identity claim and could impersonate another host. Re-enabling
the old unauthenticated registration path would also bypass the approved
per-Worker credential/HMAC contract.

This is an identity-bootstrap design gap, not a safe runtime bug that can be
fixed by choosing an ID. A secure automatic binding requires an approved
bootstrap contract that records a machine identity/fingerprint and issues or
authorizes a per-Worker credential; neither the production schema nor the
current Node Agent has that contract.

## Status

- Auto-bind MAY083: **NOT VERIFIED / BLOCKED**.
- Production heartbeat for MAY083: **NOT VERIFIED**.
- Production Worker E2E: **BLOCKED** before authentication.
- No production mutation was performed during this audit.

## Required next gate

Approve and provision one secure bootstrap identity for MAY083 (without
reusing an offline ID by guess). After that identity exists, the canonical
Node Agent can be configured with its DPAPI credential and production B2
runtime values, then heartbeat/claim/runtime evidence can be collected.
