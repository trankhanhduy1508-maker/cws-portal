# Feature Specification: Worker Resilience Hardening

**Feature Branch**: `003-worker-resilience-hardening`
**Created**: 2026-08-08
**Status**: Draft for implementation
**Input**: Selective resilience patterns from official OmniRoute documentation, applied to the existing CWS Worker/scheduler boundary only.

## Source-of-truth and boundary

This change is governed by `CURRENT_STATUS.md`, `CWS_ROADMAP_MVP_V1.md`,
`DECISIONS.md`, `AGENTS.md`, `.specify/memory/constitution.md`,
`CWS_SYSTEM_ARCHITECTURE_V1.md`, `CWS_SCALABILITY_RULES.md`,
`CODEX_ARCHITECTURE_DIRECTIVE_2026-08-08.md`, and
`CWS_PRODUCTION_E2E_ROADMAP_V2_4.md`.

OmniRoute remains development tooling only. It is not a dependency of this
feature and no OmniRoute process, API, routing engine, model, or provider is
introduced into CWS production runtime.

## Problem

CWS already has PostgreSQL atomic claim, authenticated Worker identity,
heartbeat/lease fencing, stale-task failover and a bounded retry budget. The
policy is distributed across `worker/production_node_agent.py`,
`worker/node_agent.py`, `worker/worker_engine.py`, Backend Worker RPC code and
SQL migrations. Failure categories are currently reduced to `retryable` or
`permanent`; `health_state` is read by claim but is not automatically managed;
operation retry/backoff and Worker/task retry authority are not expressed as a
single auditable contract.

## Goal

Harden the existing architecture for a stable approximately 100-Worker fleet
using the smallest additive, deterministic resilience policy:

- preserve `Job -> Task -> Worker -> Lease -> Generation -> Output`;
- distinguish customer/capability/render/host/storage/backend/network/security
  failures without poisoning healthy Workers;
- keep operation retry, Worker-attempt supervision and task failover separate;
- standardize bounded exponential backoff with deterministic jitter;
- provide automatic, lightweight Worker probing and recovery through the
  existing `health_state` boundary;
- remain secure and functional with all AI tooling disabled.

## Non-goals

- replacing `claim_next_resilient_task` or PostgreSQL `FOR UPDATE SKIP LOCKED`;
- adding a scheduler, broker, Redis/NATS/Kafka/Kubernetes/service mesh,
  event-sourcing system or AI scheduler;
- embedding OmniRoute runtime in CWS production;
- rewriting `worker_engine.py` or changing Worker identity, credential,
  storage-capability or generation-fencing ownership;
- silently changing render quality, retry budgets or `max_retries=0` without
  evidence of the existing authority;
- treating unit tests or synthetic simulations as production runtime proof.

## User Scenarios & Testing

### User Story 1 - Failures do not poison the fleet (Priority: P1)

When a Worker processes a task, CWS classifies the failure by its actual
boundary. Customer input, capability mismatch, storage/network transient and
security failures are not accidentally treated as repeated host failures.

**Independent Test**: Inject each taxonomy category through the Worker/backend
contract and assert task disposition, Worker health disposition, and generation
fencing behavior.

**Acceptance Scenarios**:

1. Given invalid customer input, when the Worker reports failure, then the
   task fails clearly and the Worker is not degraded or quarantined.
2. Given a temporary B2/network/backend error, when the bounded operation or
   task retry is used, then the Worker health remains unchanged.
3. Given repeated host/render failures on the same Worker, when thresholds are
   reached, then existing `health_state` transitions to `DEGRADED` and then
   `QUARANTINED` according to an explicit policy.
4. Given a security violation, when reported, then the task and Worker fail
   closed and no automatic probe clears the security quarantine.

### User Story 2 - Recover a quarantined Worker safely (Priority: P1)

An authenticated Worker that is no longer healthy can execute a lightweight
local probe and return through `PROBING` to `OK` without using a customer task
as a health check. A probe failure remains fail-closed.

**Independent Test**: Simulate backend auth, workspace/disk and Blender
availability probe success/failure and assert state transitions and claim
eligibility.

**Acceptance Scenarios**:

1. Given a non-security `DEGRADED` or `QUARANTINED` Worker, when an authenticated
   probe starts, then its health state is `PROBING` and it cannot claim a task.
2. Given a successful probe, when the backend records it, then health becomes
   `OK`, the Worker can claim again, and unrelated Worker credentials/data are
   unaffected.
3. Given a failed probe or an open security incident, when recovery is
   attempted, then the Worker remains quarantined.

### User Story 3 - Retry storms remain bounded (Priority: P1)

The runtime separates operation retry, Worker-attempt supervision and task
failover. Restarting 10, 25, 50 or 100 Workers uses deterministic startup and
bounded backoff so recovery does not become a claim or heartbeat storm.

**Independent Test**: Run the existing simulation harness plus targeted
10/25/50/100 Worker scenarios and inspect claim uniqueness, retry counts,
heartbeat/reconnect scheduling and stale completion rejection.

**Acceptance Scenarios**:

1. Given a transient operation error, when operation retry is enabled, then it
   stops after a bounded attempt count with exponential delay and jitter.
2. Given a Worker process failure, when the Worker supervisor reports it, then
   backend task retry/failover remains the authority; local `max_retries=0` is
   not changed unless the audit proves otherwise.
3. Given 100 simultaneous restarts or backend recovery, when Workers reconnect,
   then startup/poll/heartbeat timing remains bounded and no task has duplicate
   ownership.
4. Given a stale old generation, when it reports progress or completion, then
   the database rejects the side effect.

## Functional Requirements

- **FR-001**: The system MUST keep PostgreSQL atomic claim and generation
  fencing as the ownership authority.
- **FR-002**: The system MUST expose a stable failure taxonomy using repository
  style names: `CUSTOMER_INPUT_ERROR`, `CAPABILITY_MISMATCH`,
  `BLENDER_RENDER_ERROR`, `WORKER_HOST_ERROR`, `STORAGE_TRANSIENT`,
  `BACKEND_TRANSIENT`, `NETWORK_TRANSIENT`, and `SECURITY_VIOLATION`.
- **FR-003**: The system MUST map taxonomy to task disposition without marking
  customer/input, capability, storage, backend or network errors as Worker
  health failures.
- **FR-004**: Repeated host/render failures MUST update the existing
  `workers.health_state` under explicit bounded thresholds.
- **FR-005**: Security violations MUST fail closed and MUST NOT be cleared by
  normal automatic probing.
- **FR-006**: The system MUST provide authenticated `PROBING` recovery using
  lightweight checks and must exclude probing/quarantined/degraded Workers from
  new claims.
- **FR-007**: Operation retry MUST be bounded, exponential and jittered; it
  MUST not be confused with Worker-attempt retry or task failover.
- **FR-008**: Task failover MUST continue to use existing retry budget,
  `failed_by`, lease expiry and generation increment behavior.
- **FR-009**: The Worker MUST preserve stable identity, task-scoped storage
  capabilities, least privilege and AI-off operation.
- **FR-010**: Every resilience decision MUST be auditable through sanitized
  incident/state evidence without logging secrets or customer source data.

## Key Entities

- **Failure category**: Stable classification of an observed failure boundary.
- **Worker health state**: Existing `workers.health_state` values `UNKNOWN`,
  `OK`, `DEGRADED`, `QUARANTINED`, and the recovery state `PROBING`.
- **Operation retry**: Bounded retry of one network/storage/backend operation.
- **Worker attempt**: One claimed execution supervised by the Node Agent.
- **Task retry/failover**: Backend requeue/reassignment across generations.
- **Probe**: Authenticated, lightweight Worker readiness check, never a
  customer job.

## Measurable Outcomes

- **SC-001**: All eight taxonomy categories have deterministic disposition
  tests, including no health poisoning for customer and transient errors.
- **SC-002**: Repeated host/render failure tests demonstrate the documented
  `OK -> DEGRADED -> QUARANTINED` thresholds.
- **SC-003**: Recovery tests demonstrate `QUARANTINED/DEGRADED -> PROBING -> OK`
  for non-security failures and fail-closed behavior for security incidents.
- **SC-004**: 10/25/50/100 Worker simulations show zero duplicate claims,
  stale completion rejection and bounded retry/heartbeat scheduling.
- **SC-005**: Existing backend, Worker, fencing and storage authorization tests
  remain passing; no production infrastructure is added.

## Assumptions and clarification result

- Existing CWS PostgreSQL/Supabase, Backend gateway and Worker identity are
  reused; no new project/service is needed.
- `max_retries=0` in the canonical production Node Agent is presumed an
  intentional delegation to backend task failover until the Analyze report
  proves otherwise.
- No Founder clarification is required: the repository and owner constraints
  define the architecture boundary and recovery policy direction.
