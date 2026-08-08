# Implementation Plan: Worker Resilience Hardening

**Branch**: `003-worker-resilience-hardening` | **Date**: 2026-08-08 | **Spec**: `specs/003-worker-resilience-hardening/spec.md`

## Summary

Add a small shared resilience policy and failure taxonomy to the existing
Worker engine/Node Agent, extend the authenticated Backend Worker RPC with an
atomic failure/probe contract, and preserve PostgreSQL claim/lease/generation
ownership. Reuse `workers.health_state`, `worker_incidents`,
`jobs.max_retry_attempts`, `tasks.retry_count` and `tasks.generation`; do not
introduce a scheduler or new infrastructure.

## Technical Context

**Language/Version**: Python 3.12 Worker; TypeScript/NestJS backend;
PostgreSQL/Supabase SQL migrations

**Primary Dependencies**: Existing standard-library Python adapters,
NestJS/Supabase service, existing Windows DPAPI Worker credential and B2
task-scoped capability path

**Storage**: Existing Supabase/Postgres Worker/task tables and
`worker_incidents`; existing B2 capabilities

**Testing**: `python -m unittest discover -s worker -p "test_*.py"`, existing
backend Jest suites/build, SQL migration contract tests, resilience targeted
simulations

**Target Platform**: Existing Windows Worker host, canonical Render backend,
canonical Supabase production/staging migration process

**Project Type**: Existing CWS web/backend + Python Worker fleet

**Performance Goals**: Keep 100-Worker startup/reconnect bounded; no duplicate
claims; operation retries capped; heartbeat remains single-flight

**Constraints**: No AI runtime dependency, no new infrastructure, no broad
credentials, no quality-reducing render changes, no stale generation side
effects, no unbounded retry

**Scale/Scope**: First stable approximately 100 Workers; additive contract
must not create per-Worker manual setup work

## Constitution Check

- Documents Before Code: PASS — required CWS documents, code and evidence were
  read before implementation.
- Specify Before Implementation: PASS — this spec precedes code changes.
- Evidence Over Assumption: PASS — Analyze report cites concrete functions,
  migrations and tests; production runtime remains separately labeled.
- AI-Off Runtime: PASS — no OmniRoute/Codex/AI dependency is introduced.
- Secure Boundaries and Auditability: PASS — authenticated gateway, stable
  Worker identity, task-scoped storage and generation fencing remain intact.
- Scale by Design / MVP First: PASS — deterministic backoff only; no broker or
  scheduler rewrite.
- Existing Infrastructure Only: PASS — canonical Backend/Supabase/B2 only.
- Verification and Rollback: PASS — additive migration and explicit rollback
  section are required before deployment.
- Source-of-Truth Sync: PASS — docs/evidence updates are tasks in this plan.

## Existing architecture decision

The audit found that CWS already has the equivalent of OmniRoute's basic
request fallback primitives at the correct boundaries: deterministic startup
jitter (`_stable_startup_jitter`), poll backoff in
`ProductionNodeAgentRuntime.run_forever`, non-blocking single-flight heartbeat
in `NodeAgent`, PostgreSQL `SKIP LOCKED` claim, stale lease requeue and
generation fencing. OmniRoute-style model/provider routing is explicitly not
applicable to CWS production.

## Implementation structure

```text
worker/
├── resilience_policy.py       # taxonomy and bounded backoff primitives
├── node_agent.py              # reuse policy for local recovery timing
├── production_node_agent.py   # operation retry, probe, taxonomy reporting
└── worker_engine.py           # classify observable failures

backend/src/worker-auth/
├── worker-rpc.service.ts      # allowlist/validation for failure and probe RPCs
└── worker-rpc.service.spec.ts

worker_migrations/
└── 027_worker_resilience_policy.sql # additive atomic failure/probe contract

specs/003-worker-resilience-hardening/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/requirements.md
```

## Data and contract design

1. Failure reporting validates task, Worker, status and generation before any
   side effect.
2. Customer/capability/security failures are not silently retried as healthy
   Worker failures; security sets a fail-closed quarantine.
3. Storage/backend/network transient failures use the existing task retry/failover
   contract and do not change health.
4. Host/render failures update existing incidents and health thresholds while
   the task still follows the existing bounded job retry budget.
5. Probe start sets `PROBING`; success returns a non-security Worker to `OK`;
   failure keeps it quarantined. Claims exclude all non-ready health states.
6. Migration is additive, service-role-only through the existing authenticated
   Backend gateway, with rollback instructions that restore prior RPC usage.

## Rollback and failure handling

- Disable the new Worker RPC calls and redeploy the previous Node Agent/backend
  pair; existing `fail_task`, `report_heartbeat`, claim and stale requeue remain
  available.
- Do not drop existing state columns or tables automatically.
- If the additive migration cannot be applied safely, stop at the migration
  blocker and do not claim production readiness.
- Security or generation rejection always fails closed; no client retry may
  bypass it.
