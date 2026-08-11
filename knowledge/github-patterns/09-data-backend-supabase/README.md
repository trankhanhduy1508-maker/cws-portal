# 09 — Supabase / Postgres Backend Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: Supabase Auth/Postgres/Realtime, PostgREST semantics, RLS/data ownership, migrations/RPCs.

## Primary top-tier sources

### 1. `supabase/supabase` — ~104k stars
https://github.com/supabase/supabase

CWS already uses Supabase, so this is both a high-popularity and directly authoritative ecosystem reference.

CWS lessons:
- Postgres is the durable core; Auth, APIs and Realtime surround it rather than replace its constraints;
- server-side RLS/authorization matters even when frontend already hides controls;
- migrations/schema are production contracts;
- Realtime is useful for observing changes but should not become durable ownership truth;
- auth identity and business object ownership remain separate checks.

### 2. `PostgREST/postgrest` — ~27.2k stars
https://github.com/PostgREST/postgrest

REST API directly shaped from PostgreSQL schema/functions/permissions.

CWS lessons:
- database constraints/functions can encode important contracts close to data;
- SQL functions/RPCs exposed through an API require careful privilege boundaries;
- API behavior follows schema/roles, so migration review is security review;
- stable DB function signatures deserve contract tests.

### 3. PostgreSQL upstream source/docs (`postgres/postgres`) — authoritative database reference
https://github.com/postgres/postgres

For concurrency/transaction/locking semantics, PostgreSQL itself is more authoritative than queue-framework folklore.

CWS lessons:
- transaction isolation and row locks have precise semantics;
- `FOR UPDATE SKIP LOCKED` should be understood as a DB concurrency primitive, not a magic queue guarantee;
- constraints/transactions should protect invariants where practical;
- application-level checks alone are weaker under concurrency.

## CWS backend boundaries

### Customer

Frontend obtains Customer session, but Backend/database must verify:
- authenticated identity;
- object ownership;
- state transition authorization;
- download/payment eligibility.

### Worker

Worker does **not** become a normal Supabase client with privileged credentials.

Canonical path:

`Worker -> authenticated Backend gateway -> privileged server-side RPC/DB operation`

Worker must not receive service-role credential.

### Admin

Separate Admin hostname/UI does not bypass Backend staff-role + AAL2 authorization.

## Database invariant philosophy

When an invariant can be expressed safely near data, prefer defense in depth:

- foreign keys;
- CHECK constraints;
- unique constraints/indexes;
- transactional RPCs;
- locked rows;
- server-side ownership conditions.

Examples relevant to CWS:
- metadata consistency: `total_frames = frame_end - frame_start + 1` when bounds exist;
- valid state-transition guards;
- unique transaction/payment reference where required;
- task ownership update fenced by current generation;
- task graph creation protected from duplicate execution.

Not every complex frame-overlap invariant must immediately become an exotic DB constraint. Start with deterministic single transactional writer + validation, then add DB defense where migration risk/value is justified.

## Realtime principle

Realtime can improve Customer/Admin progress UX, but:
- dropped socket != lost durable state;
- reconnect should re-read current durable status;
- frontend progress must never invent state when events are missing;
- Realtime event is notification, Postgres row/state is truth.

## Migration rules

- additive first where possible;
- no guessed backfill values for unknown historical data;
- partial legacy states explicitly handled;
- idempotent migration conventions preserved;
- privilege grants/revokes reviewed;
- rollout compatibility considered before NOT NULL/tight constraints;
- irreversible/destructive change requires Founder approval.

## RPC security checklist

For privileged Worker RPCs verify as relevant:
- caller path restricted to Backend service role;
- authenticated worker identity supplied/verified by Backend;
- task belongs to expected Job;
- Worker owns active Task;
- generation matches;
- state is eligible;
- retries are idempotent when intended;
- stale/conflicting mutations fail closed;
- no broad user-controlled SQL object identifiers.

## What CWS should not adopt blindly

- direct frontend service-role access;
- direct Worker privileged Supabase RPC execution;
- RLS disabled to simplify development;
- Realtime as state authority;
- new database technology just because another architecture uses it;
- schema changes without compatibility/rollback review.

## Activation

Load for Supabase/Postgres/RPC/RLS/Realtime/data-migration work. Current migrations and production schema remain higher authority than this note.
