# Spec 009 — Automatic Worker Provisioning

> Status: FOUNDER APPROVED — ACTIVE 1-WORKER PROVISIONING BLOCKER
> Date: 2026-08-12
> Latest Founder refinement: an already-approved site/fleet must provision future PC batches without repeated Founder/Admin authorization.

## Goal

Make normal CWS Worker provisioning unattended after **one initial site/fleet trust onboarding** while preserving the existing Backend gateway, per-Worker credentials, Node Agent lifecycle, PostgreSQL claim/lease/generation fencing, and current infrastructure topology.

The operator must not manually choose Worker IDs, manually issue/copy one enrollment ticket per normal Worker, edit one Worker row per machine, repeat enrollment per Job, or return to Founder/Admin for each new batch of PCs at an already-approved site/fleet.

The current physical 1-Worker pilot remains the gate before scaling beyond one Worker.

## Founder-approved canonical identity model

For the current CWS machine/runtime model:

`1 physical PC = 1 canonical PCID/Worker ID`

`PCID` and `Worker ID` are aliases for the same canonical `worker_id`. There is no second independent PC-ID namespace.

Any legacy active guidance that creates a separate PCID, sequential PC number, MachineGuid-derived Worker ID, hostname-derived Worker ID, or another parallel machine-ID namespace is superseded.

### Canonical ID generation

Backend owns canonical Worker ID generation during first provisioning.

Requirements:

- Generate **128 bits of cryptographically secure random entropy** server-side.
- Preferred representation: `cwsw_` + 32 lowercase hexadecimal characters.
- Database `PRIMARY KEY`/`UNIQUE` enforcement is authoritative.
- A collision is rejected; Backend generates a fresh random ID and retries in a bounded/idempotent path.
- Never overwrite, merge, or reuse another physical PC identity because of a collision.
- The ID is opaque and must not encode hostname, site number, GPU, CPU, customer, Job, frame range, MachineGuid, serials, fingerprint, or sequential count.
- The ID survives normal reboot/reconnect and all normal Jobs.
- Scheduler ownership, heartbeat, Worker state, logs, task ownership, and host accounting all use this one ID.

Machine fingerprint is separate in **purpose**: enrollment/recovery security evidence only. It must not become a second machine identity.

## Canonical provisioning flow

### Initial site/fleet onboarding — one human trust decision

A new partner site/fleet may require **one initial authenticated Founder/Admin approval** to establish trust, scope, owner, policy, quota/capacity limits, revocation controls, and a site-controller trust anchor.

Canonical initial onboarding:

`Founder/Admin approves site once -> Backend records durable APPROVED site/fleet trust -> Backend establishes site-scoped controller identity/trust material -> site becomes autonomous for normal provisioning within policy`

This is a site/fleet onboarding event, **not a per-PC event and not a per-batch event**.

### Approved site/fleet normal batch provisioning — zero Founder/Admin interaction

Once the site/fleet is already approved:

`approved site controller/trust -> unattended PC bootstrap -> machine fingerprint evidence -> Backend verifies approved site scope/policy -> Backend generates canonical PCID/Worker ID -> Backend automatically creates bounded enrollment material -> PC redeems -> per-Worker credential -> DPAPI -> Node Agent -> authenticated heartbeat -> ACTIVE_IDLE`

Adding another batch of PCs at the same approved site MUST NOT require the Founder/Admin to:

- log in again merely because a new batch is starting;
- call `POST /worker/enrollment/site-bootstrap` for that batch;
- issue/copy per-machine tickets;
- choose Worker IDs;
- create Worker rows;
- approve every PC individually.

## Durable approved-site trust vs short-lived capability

This distinction is binding:

- **Site/fleet approval** is durable server-side authorization state until explicitly revoked/suspended or materially re-onboarded.
- **Site controller credential/trust anchor** authenticates the already-approved site/controller. It is site-scoped and must be stored outside shared Worker/Golden Image credentials.
- **Short-lived provisioning capability/token** may be generated, renewed, rotated, or exchanged automatically by the approved site controller/Backend.
- Expiry of a short-lived token MUST NOT automatically mean the Founder/Admin has to approve the site again.
- Normal token renewal/rotation is automated while the site remains approved and within policy.
- Founder/Admin interaction is reserved for exceptional trust events: first onboarding, explicit revocation/suspension, ownership/site transfer, root trust reset, major policy/capacity change, or security recovery requiring human judgment.

The current endpoint `POST /worker/enrollment/site-bootstrap` may remain for **initial onboarding, explicit trust reset, or exceptional privileged rotation**, but it must not be the canonical gate for every future PC batch at an approved site.

If current code requires a fresh Admin AAL2 call to `/site-bootstrap` before each normal batch, that is now an **implementation gap to remove**, not accepted workflow.

## Site/Fleet controller security contract

The approved site/fleet controller/trust mechanism:

- is limited to its own site/fleet;
- is provisioning-only;
- is NOT a Worker runtime credential;
- is NOT a Supabase service-role credential;
- grants no Task claim/render/payment/B2 master authority;
- is revocable and auditable;
- uses server-side quota/rate/capacity policy;
- cannot authorize another site/fleet;
- must fail closed when the site is suspended/revoked, policy is exceeded, or trust validation fails;
- must support automatic bounded renewal/rotation without Founder/Admin interaction while the site remains approved.

Compromise of one site controller must not grant broad control over other sites or unrelated runtime/storage/payment privileges.

The site controller secret/trust material must **not** be baked into the shared Golden Image. Shared images may contain only non-secret site configuration/identifiers needed to discover the approved provisioning path.

## Worker ID generation owner

Backend is the canonical PCID/Worker ID generation owner.

- Worker ID is generated server-side inside the authoritative provisioning path.
- Worker ID is unique and stable for the physical Worker identity.
- Founder/Admin/operator never types/selects it.
- Worker ID is not derived from hostname, GPU, MachineGuid, serials, fingerprint, or sequential counters.
- Worker ID is not generated per Job.
- Concurrent/retried provisioning is idempotent and must not create duplicate active identities for the same machine binding.

## Machine fingerprint contract

Enrollment binding uses a composite machine fingerprint rather than one mutable/spoofable attribute.

- Fingerprint may combine bounded device signals such as TPM/device evidence when available, Windows MachineGuid, motherboard/system/BIOS identifiers, and other reliable supported attributes.
- Raw attributes do not become the canonical Worker ID.
- Fingerprint is normalized deterministically before hashing/comparison.
- Prefer minimum necessary normalized/hash representation.
- Fingerprint supports binding, duplicate/replay evidence, and recovery decisions.
- Legitimate hardware changes enter bounded recovery logic; they must not silently create a second Worker ID.
- Missing/invalid site authorization or fingerprint mismatch fails closed.

## Enrollment/bootstrap security invariants

- Existing one-time ticket/enrollment primitives may be reused internally.
- Humans do not create/copy per-machine tickets in the normal path.
- Bounded enrollment material is generated automatically by Backend after approved-site authorization is verified.
- Enrollment material is bound to site/fleet + generated Worker ID + machine/fingerprint evidence.
- Redemption is idempotent under safe retry and replay-resistant after authoritative consumption.
- New automatic fingerprint-bound tickets must not be redeemable through a legacy unbound path.
- No shared per-fleet Worker credential.
- No Supabase service-role key on Worker or site controller.
- No long-lived B2 master credential on Worker.
- Per-Worker credentials remain unique and are stored with Windows DPAPI.
- Credential plaintext must never be logged.

## Normal reboot/reconnect

`load existing Worker identity + DPAPI credential -> Node Agent -> authenticate/heartbeat -> ACTIVE_IDLE`

Normal reboot MUST NOT re-enroll while the credential is valid.

## Canonical runtime ownership

This spec does not change task execution ownership:

- Node Agent remains the single resident Windows supervisor.
- Worker Engine remains task-scoped and is launched only by Node Agent.
- Authenticated Backend Worker gateway remains authoritative.
- PostgreSQL atomic claim, lease, generation fencing, retry/failover semantics remain unchanged.
- Provisioning is not performed per Job.
- AI/Founder/Admin are not normal Worker runtime dependencies.

## Recovery path

Recovery/re-enrollment is exceptional.

Allowed triggers include credential loss/corruption, explicit revocation, authorized reprovisioning/hardware replacement, per-machine persistent-state loss, or security incident recovery.

Recovery remains Backend-authorized and auditable. It must not silently fall back to MachineGuid as Worker ID or manual SQL/row creation.

Human approval may be required only when recovery changes trust/ownership or is security-sensitive; ordinary credential/token rotation for an approved site should remain automated where policy permits.

## Non-goals

This specification does not authorize:

- a second PCID namespace;
- sequential PC numbers as canonical identity;
- per-PC Founder/Admin approval;
- per-batch Founder/Admin approval for an already-approved site/fleet;
- manual per-machine ticket copying;
- a shared Worker credential in a Golden Image;
- site-controller secret in a shared Golden Image;
- changing Customer workflow, payment/pricing/storage order;
- changing Scheduler ownership or claim/lease/generation fencing;
- adding Redis/NATS/Kafka/RabbitMQ/new control-plane infrastructure;
- creating duplicate Vercel/Render/Supabase/B2 resources.

## Current implementation reconciliation required

PR #37 established the first automatic provisioning implementation and production migrations 030/031/032. The production Backend now exposes automatic provisioning routes.

However, the current implementation still uses an Admin AAL2 `POST /worker/enrollment/site-bootstrap` issuance step as the immediate way to create a site bootstrap capability. Under the latest Founder decision:

- this privileged call is valid for **first site onboarding / explicit trust reset**;
- it is **not valid as a mandatory action before every new batch** at an already-approved site;
- approved-site trust must persist independently of short-lived provisioning tokens;
- an approved site controller/Backend path must autonomously renew/exchange bounded provisioning capability within approved policy.

Therefore the next implementation slice is to remove the batch-level Founder/Admin dependency while preserving all security boundaries.

## Smallest next implementation slice

1. Ground current `site-bootstrap`/`provision` controller/service, migrations 030–032, fleet/site schema, staff authorization, Worker bootstrap scripts, and production deployment.
2. Determine how current CWS stores the durable fact that a site/fleet is approved and who/what owns its site-controller identity.
3. Add the smallest durable **approved-site provisioning trust** representation using existing Backend/Postgres infrastructure only.
4. Keep Admin AAL2 site onboarding only for first onboarding, explicit suspension/revocation reversal, root trust reset, ownership change, or similarly exceptional operations.
5. Add an authenticated site-controller path that can automatically obtain/rotate short-lived provisioning capability while site status remains approved and policy/quota allows it.
6. Do not put the site-controller secret in the Golden Image; keep it in the approved site/controller secure boundary.
7. Keep per-PC Worker ID generation, fingerprint binding, ticket creation/redeem, DPAPI, and Node Agent flow automatic.
8. Add tests proving a second and later batch at an approved site requires **zero Founder/Admin call**.
9. Add tests proving revoked/suspended site, wrong site controller, exceeded policy/quota, or cross-site use fails closed.
10. Run exactly ONE physical Worker through the autonomous approved-site path -> heartbeat -> ACTIVE_IDLE and STOP.

## Required verification

### Approved-site autonomy

- first site onboarding can remain privileged and audited;
- once approved, batch 1, batch 2, batch N provisioning does not require Founder/Admin login/action;
- short-lived token expiry causes automatic renewal/exchange, not human re-approval;
- site revocation/suspension immediately blocks new provisioning;
- cross-site controller use fails;
- quota/capacity/rate policy is enforced server-side;
- normal site-controller renewal does not escalate scope.

### Worker identity/security

- canonical `PCID = Worker ID`;
- 128-bit CSPRNG generation;
- DB uniqueness + bounded collision retry;
- same-machine retry idempotency;
- fingerprint mismatch/replay rejected;
- no manual Worker ID/ticket;
- no broad secret exposure;
- DPAPI persistence works;
- Node Agent reaches authenticated heartbeat and ACTIVE_IDLE.

### Scale rule

The same operating model must remain viable at 1, 100, 1,000, 10,000, and 1,000,000 Workers without a Founder/Admin action per PC **or per batch** at an already-approved site.

## Current 1-Worker production gate

The next runtime objective is:

`approved-site autonomous authorization -> automatic first PC provisioning -> Backend-generated PCID/Worker ID -> DPAPI credential -> CWSNodeAgentProduction -> authenticated heartbeat -> ACTIVE_IDLE -> STOP`

Do not start a second Worker until this gate passes and Founder explicitly allows scale-out.

## Evidence language

Implementation/tests alone are `CODE VERIFIED`/`INTEGRATION VERIFIED` only.

Production provisioning is not `PRODUCTION RUNTIME VERIFIED` until a real physical Worker executes the canonical autonomous approved-site flow and reaches authenticated production heartbeat/ACTIVE_IDLE.

Golden Customer E2E remains a separate gate.
