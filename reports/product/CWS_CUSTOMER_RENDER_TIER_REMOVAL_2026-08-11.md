# CWS Customer Render Tier Removal — 2026-08-11

## Founder decision
The customer render speed/tier feature is removed entirely from the active CWS product. Customer does not choose a render tier, Worker count, GPU or CPU. Scheduler owns capacity automatically under the approved deadline-driven workflow.

## Root cause
The public selection gate had already been removed from the primary Customer create flow, but legacy artifacts remained across UI constants/components, Backend DTO/domain/repository/API contracts, tests and active Spec Kit documents. Those artifacts could mislead a future coding agent into recreating the removed product behavior.

## Scope implemented on branch
`founder/remove-render-profiles-2026-08-11`

Removed from active runtime/contracts:
- Customer tier constants/card/screen/estimate hook;
- tier display in History;
- tier-specific pre-render estimate API;
- tier field from Customer create DTO/domain/public JSON/repository mapping/idempotency fingerprint;
- obsolete Backend render-profile domain module;
- tier fields from active tests/load simulation;
- obsolete DB column through additive migration `backend/migrations/020_remove_render_profile.sql`.

Reconciled active instructions:
- `README.md`;
- `CURRENT_STATUS.md`;
- `DECISIONS.md`;
- `CWS_ROADMAP.md`;
- `CWS_MVP_WORKFLOW_FINAL.md`;
- `AGENTS.md`;
- Spec 008 `spec.md`, `plan.md`, `tasks.md`;
- `backend/API_DOCUMENTATION.md`.

## Preserved intentionally
Historical evidence/reports and already-applied historical migration files are not rewritten merely to erase the record that the old behavior once existed. They are historical evidence, not active product instructions. The new additive migration removes the obsolete live schema field when applied.

The word “priority” used for Founder/task/security/operational priority is unrelated to the removed customer render-tier feature and is not deleted.

## Non-goals
- no Scheduler architecture implementation;
- no change to atomic claim/lease/generation fencing;
- no Worker security boundary change;
- no payment/Admin redesign;
- no new infrastructure.

## Verification status
At report creation this branch has not yet been promoted beyond code review/CI. Database removal is not a production fact until the migration is applied through the existing production migration process. Golden Production E2E remains separate and unproven.
