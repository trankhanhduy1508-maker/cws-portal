# CWS Worker Resilience — Production Runtime Verification

Date: 2026-08-08  
Supabase project: `ynhxlxetwuiyejcjypsi`  
Backend: `https://cws-portal.onrender.com`  
Host: `MAY083`  
Worker: `CWS-BAE2782D20525D46`

## Result

**PRODUCTION RUNTIME VERIFIED: PARTIAL**

The production migration, authenticated Worker probe, normal heartbeat and
real capability-aware claim request are verified. Full task execution,
generation fencing under reassignment, Blender/output and stale completion are
**NOT VERIFIED** because production currently has no eligible B2 task and the
exact customer job cannot be created without a real customer Supabase session.

No task, payment, PAID state or output row was fabricated or edited.

## 1. Migration discovery and apply

Before apply, Supabase production migration list ended at
`bounded_worker_enrollment`; `worker_resilience_policy` was absent.

Project read-back before apply:

- project ref: `ynhxlxetwuiyejcjypsi`;
- status: `ACTIVE_HEALTHY`;
- region: `ap-southeast-1`;
- PostgreSQL: `17.6.1.155` / engine 17;
- URL: `https://ynhxlxetwuiyejcjypsi.supabase.co`.

The checked-in additive migration
`worker_migrations/027_worker_resilience_policy.sql` was applied through the
Supabase connector. Apply response: `{"success":true}`.

Production migration read-back:

```text
version: 20260808141634
name: worker_resilience_policy
```

The migration contains no reset, drop, delete or new project operation.

## 2. Production RPC contract read-back

Direct production catalog query verified these exact functions:

| RPC | Signature | SECURITY DEFINER | service_role | anon | authenticated |
|---|---|---:|---:|---:|---:|
| `claim_next_resilient_task` | `(text, integer, text[])` | true | true | false | false |
| `report_worker_failure` | `(bigint, integer, text, text, text)` | true | true | false | false |
| `report_worker_probe` | `(text, text, text)` | true | true | false | false |

All three functions have pinned `search_path=public, pg_temp`.

## 3. Real Worker probe and contract mismatch

The existing normal Worker process was restarted after migration 027 on the
real MAY083 host. The first authenticated probe exposed a real contract bug:

- request: `POST /worker/rpc/report_worker_probe`;
- response: HTTP `201`, body `healthy`;
- old Worker client result: `JSONDecodeError`;
- production health after `PROBING`: remained `PROBING`.

Root cause: `worker/worker_rpc_auth.py` unconditionally parsed every successful
body with `json.loads()`, while the canonical Backend returned the successful
string RPC result as plain text.

The minimal fix accepts JSON and successful UTF-8 text, preserves empty-body
`None`, and keeps non-2xx errors fail closed. No backend, schema, auth or retry
architecture was changed.

Spec Kit fix: `specs/004-worker-rpc-response-contract/`.

## 4. Real Worker runtime after fix

The canonical normal claim loop is running on MAY083 as PID `5568` after the
fix. It uses the existing DPAPI credential and Worker gateway; no secret is
recorded here.

Authenticated probe evidence:

- direct real Worker request: HTTP `201`, body `healthy`;
- Supabase transition: `health_state=PROBING` → `health_state=OK`;
- transition timestamp: `2026-08-08 14:23:25.086367+00`;
- state reason: `production verification probe`.

Normal Worker read-back:

```text
observed_at:        2026-08-08 14:35:16.913819+00
worker_id:          CWS-BAE2782D20525D46
status:             idle
health_state:       OK
observed_state:     ACTIVE_IDLE
last_seen_at:       2026-08-08 14:35:02.483339+00
current_task_id:    null
current_generation: null
```

An earlier read had `last_seen_at=2026-08-08 14:34:37.898985+00`; the later
timestamp proves the normal Worker heartbeat continued autonomously.

## 5. Real atomic claim boundary

The real Worker code issued an authenticated B2-only
`claim_next_resilient_task` request after the fix. Result:

```text
AUTHENTICATED_CLAIM_RESULT=NONE
```

Production inventory explains the empty claim without a code or auth failure:

- queued Google Drive tasks: 114;
- queued `other` tasks: 133;
- production rows with `blend_link LIKE 'b2://%'`: `[]`;
- Worker capability: B2 only;
- Worker status after claim: idle, no task, no generation.

The B2-only Worker correctly did not claim historical Google Drive backlog.
This verifies the real authenticated capability-aware claim boundary, but it
cannot prove ownership/lease assignment without an eligible B2 task.

## 6. Verification matrix

| Requirement | Status | Evidence |
|---|---|---|
| Migration 027 applied | PASS | version `20260808141634` |
| RPC signatures/grants | PASS | production catalog read-back |
| Worker registration/identity | PASS | real Worker `CWS-BAE2782D20525D46` |
| Authenticated probe | PASS | HTTP 201 `healthy`, `PROBING -> OK` |
| Heartbeat | PASS | advancing `last_seen_at`, `ACTIVE_IDLE` |
| Atomic claim request | PASS | real B2-only claim returned `NONE` |
| Lease assignment | NOT VERIFIED | no eligible B2 task |
| Generation fencing on reassignment | NOT VERIFIED | no claimed task/generation |
| Retry/failure handling on a task | NOT VERIFIED | no eligible task |
| Blender PID/render/output | NOT VERIFIED | no task |
| Stale completion rejection | NOT VERIFIED | no real reassigned generation |

## 7. True external blocker

The first remaining blocker is upstream of Worker claim: production has no
customer-owned B2 task.

The exact Drive input was previously materialized once to B2, but the next real
job request returned:

```text
POST https://cws-portal.onrender.com/jobs
HTTP 401
{"message":"Thiếu Bearer token"}
```

Required external action: a customer must complete Google OAuth in the existing
canonical portal session at `https://cws-portal.vercel.app/`, then submit the
already materialized input through the real customer flow. Codex cannot obtain
or fabricate that customer Bearer token. The public Supabase key is not a
customer identity.

After that real job exists, the current normal Worker is already online and
will claim only an eligible B2 task through the existing production path.

## Verification labels

- **CODE VERIFIED: PASS** — Worker suite 96 tests, 1 skipped; backend Worker
  RPC suite 11/11; migration read-back passed.
- **SIMULATION VERIFIED: PASS** — existing 10/25/50/100 Worker simulation
  remains passing.
- **PRODUCTION RUNTIME VERIFIED: PARTIAL** — migration, probe, heartbeat and
  empty capability-aware claim are real; full task lifecycle is blocked by the
  missing customer-owned B2 task.
�