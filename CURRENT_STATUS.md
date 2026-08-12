# CURRENT_STATUS

## Current Phase
Customer MVP workflow convergence before Golden Production E2E.

## Founder Priority — 2026-08-12
Customer remains the highest-priority product path, but the immediate runtime bottleneck is **automatic first provisioning of exactly one physical Worker through an already-approved site/fleet without repeated Founder/Admin authorization**.

Do not scale to multiple Workers until the 1-Worker provisioning/runtime gate passes.

## Latest Founder Decision — Approved Site/Fleet Must Provision Autonomously
For a site/fleet that has already completed its initial trust onboarding:

**Founder/Admin must not authorize every new PC batch.**

Canonical operating model:

`site approved once -> durable approved-site trust -> site controller/backend automatically obtains/rotates bounded provisioning capability -> unattended PC bootstrap -> Backend-generated Worker ID -> fingerprint-bound enrollment -> DPAPI -> Node Agent -> heartbeat -> ACTIVE_IDLE`

A short-lived provisioning token may expire, but token expiry must not force human re-approval of the site. Renewal/exchange is automatic while the site remains approved and within server-side policy.

Founder/Admin interaction is reserved for exceptional trust events such as first site onboarding, explicit suspension/revocation, ownership/site transfer, root trust reset, major policy/capacity change, or security recovery requiring human judgment.

The current Admin AAL2 `POST /worker/enrollment/site-bootstrap` path may remain for those exceptional/initial trust operations. It must **not** remain the mandatory gate before every future PC batch at an approved site.

If current code requires a fresh Founder/Admin AAL2 call before every batch, that is the current implementation gap to remove.

## Canonical Machine Identity

`1 physical PC = 1 canonical PCID/Worker ID`

`PCID` is an alias for the same canonical `worker_id`; no second PC-ID namespace exists.

Binding rules:

- Backend generates 128-bit CSPRNG IDs.
- Preferred representation: `cwsw_` + 32 lowercase hex characters.
- Database uniqueness/primary-key enforcement is authoritative.
- Collision retry is bounded and may never overwrite another Worker.
- ID is not derived from hostname, GPU, MachineGuid, fingerprint, serial number, site counter, Job, customer, or sequential PC number.
- Machine fingerprint is enrollment/recovery evidence only.
- Normal reboot/reconnect reuses the same Worker ID + DPAPI credential.

## Current Active Spec
`specs/009-automatic-worker-provisioning/`

The spec now explicitly supersedes any design that requires Founder/Admin authorization per new batch at an already-approved site.

## Verified Current State

- Customer Login Gate: implemented/synced.
- Customer Input Validation Gate: implemented/synced.
- Customer render speed/tier removal: merged in PR #33.
- Task Graph foundation: merged in PR #36.
- Production Task Graph migration/RPC: applied and verified.
- Automatic Worker provisioning implementation: merged in PR #37.
- PR #37 merge commit: `0cbbd1325dd35a50e9d733212ef095dba58d3bba`.
- Backend/Worker/Windows verification for PR #37: PASS before merge.
- Production migrations `030_automatic_worker_provisioning`, `031_legacy_enrollment_compatibility_bridge`, and `032_harden_automatic_enrollment_null_inputs`: applied/verified.
- Production Backend health: verified HTTP 200 after merge.
- Production routes `/worker/enrollment/site-bootstrap` and `/worker/enrollment/provision`: present; unauthenticated requests fail closed.
- Golden Production E2E: **NOT PROVEN**.
- Exact physical Worker heartbeat/`ACTIVE_IDLE`: **NOT YET PROVEN**.

## Current Runtime Blocker
The code currently exposes an Admin AAL2 path for creating a site bootstrap capability. That is acceptable for **initial site onboarding or exceptional trust reset**, but the latest Founder decision forbids using it as a repeated batch-level gate for an already-approved site/fleet.

Therefore the immediate blocker is no longer “Founder must log in and issue another bootstrap capability.”

The blocker is:

**reconcile approved-site trust so normal batch provisioning can autonomously obtain/rotate bounded provisioning capability without Founder/Admin interaction.**

Do not bypass this with manual Worker ID, per-machine ticket, manual SQL identity creation, MachineGuid identity, shared fleet Worker credential, or service-role secret on the Worker/site controller.

## Next Required Convergence

1. Ground current site/fleet schema, staff auth, `site-bootstrap`/`provision` routes, migrations 030–032, and Worker bootstrap code.
2. Identify the durable server-side representation of an approved site/fleet and the site-controller trust owner.
3. Add the smallest approved-site controller/trust path using existing Backend/Postgres infrastructure only.
4. Keep Founder/Admin AAL2 only for initial/exceptional trust operations, not every batch.
5. Allow the approved site controller/Backend to automatically obtain/renew short-lived provisioning capability within scope/quota/rate policy.
6. Preserve Backend-generated `PCID = Worker ID`, fingerprint binding, collision protection, DPAPI, Node Agent lifecycle, and all existing Worker security boundaries.
7. Verify exactly one physical PC: autonomous approved-site provisioning -> Worker ID -> DPAPI -> `CWSNodeAgentProduction` -> authenticated heartbeat -> `ACTIVE_IDLE`.
8. STOP and report evidence.
9. Only after Founder review: run one-Worker real Job/Task/render, then 2–3 Worker concurrency, then 10-Worker/adaptive scaling.

## Scale Gate

`1 Worker autonomous provisioning/runtime PASS -> Founder review -> 1 Worker real Job/Task/render PASS -> Founder review -> 2–3 Workers -> 10 Workers -> adaptive scaling`

Do not jump directly to 10 Workers.

## Customer Automatic Deadline Scheduling
The customer render speed/tier feature remains removed.

Customer target flow remains:

`Google Login -> input -> validate/materialize -> Start render -> Job -> durable Tasks -> automatic capacity -> real runtime evidence -> adaptive scale when <=45-minute final-output target is at risk -> final output -> B2 lock -> preview/price/QR -> SePay -> PAID -> download`

Multi-Worker/adaptive work remains sequenced behind the 1-Worker production gate.

## Golden Production E2E
Still **NOT PROVEN**. Code, CI, migration, route existence, or deployment health alone does not establish Golden E2E.

## Last Updated
2026-08-12 — PR #37 merged and automatic provisioning migrations/routes are live. Founder then clarified that an already-approved site/fleet must not require repeated Founder/Admin authorization for each new PC batch. Spec 009 and the active bottleneck were reconciled accordingly.
