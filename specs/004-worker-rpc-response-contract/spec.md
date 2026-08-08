# Production Worker RPC Response Contract Fix

**Feature Branch**: `004-worker-rpc-response-contract`
**Date**: 2026-08-08
**Status**: Ready for implementation

## Source of truth

This verification fix follows `AGENTS.md`,
`.specify/memory/constitution.md`, `CURRENT_STATUS.md`,
`CWS_ROADMAP_MVP_V1.md`, `CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`,
`DECISIONS.md`, `specs/003-worker-resilience-hardening/`,
`worker/worker_rpc_auth.py`, `worker/production_node_agent.py`, and
`backend/src/worker-auth/worker-rpc.controller.ts`.

## Problem

The real production `report_worker_probe` request returned HTTP 201 with the
plain-text body `healthy`. The existing Worker RPC client unconditionally calls
`json.loads()` on every successful response and therefore raises
`JSONDecodeError`. The authenticated Worker remains in `PROBING` even though
the production RPC succeeded.

## Goal

Make the existing Worker RPC client accept both JSON responses and the actual
plain-text success responses emitted by the canonical Backend, without changing
authentication, RPC allowlists, task ownership, generation fencing, retry
authority, or production architecture.

## Non-goals

- no new dependency or service;
- no scheduler, database, migration, or schema change;
- no change to Worker identity, credentials, claim, lease, generation, or B2
  capability boundaries;
- no customer task or fake production data;
- no weakening of HTTP status/error handling.

## Acceptance criteria

1. A successful JSON response remains parsed exactly as before.
2. A successful plain-text response such as `healthy` is returned as a string.
3. Non-2xx responses still fail closed as Worker RPC errors.
4. Empty successful responses remain `None`.
5. Unit tests cover JSON, plain text, empty body and HTTP error behavior.
6. The real MAY083 Worker reaches `PROBING -> OK` after deployment and keeps
   an authenticated heartbeat.
7. The real B2-only claim request executes and returns no assignment without
   mutating the existing Drive backlog.

## Clarification

No Founder clarification is required. The real production response and the
existing source code determine the smallest compatible fix.
