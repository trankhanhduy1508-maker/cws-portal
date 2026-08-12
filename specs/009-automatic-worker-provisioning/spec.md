# Spec 009 — Automatic Worker Provisioning

> Status: FOUNDER APPROVED — ACTIVE 1-WORKER PROVISIONING BLOCKER
> Date: 2026-08-12

## Goal

Make normal CWS Worker provisioning unattended after one authorized site/fleet onboarding, while preserving the existing Backend gateway, per-Worker credentials, Node Agent lifecycle, PostgreSQL claim/lease/generation fencing, and current infrastructure topology.

The operator must not manually choose Worker IDs, manually issue/copy one enrollment ticket per normal Worker, edit one Worker row per machine, or repeat enrollment per Job.

The current physical 1-Worker pilot is blocked because the test PC has no canonical Worker identity/credential yet. This spec is therefore the active runtime blocker before scaling beyond one Worker.

## Founder-approved canonical identity model

For the current CWS machine/runtime model:

`1 physical PC = 1 canonical PCID/Worker ID`

`PCID` and `Worker ID` are two names for the same canonical `worker_id` value. There is no second independent PC-ID namespace to create, reconcile, or maintain while one physical PC maps to one Worker runtime.

Any legacy document/code idea that creates a separate PCID, sequential PC number, MachineGuid-derived Worker ID, hostname-derived Worker ID, or another parallel machine-ID namespace is superseded as active design guidance.

### Canonical ID generation

Backend owns ID generation during authorized first provisioning.

Requirements:

- Generate **128 bits of cryptographically secure random entropy** server-side.
- Preferred canonical representation: `cwsw_` + 32 lowercase hexadecimal characters.
- Example shape only: `cwsw_d77a91e54e824683a4b03ac20b5e4f11`.
- The database must enforce `worker_id` with `PRIMARY KEY` or equivalent `UNIQUE` protection.
- A collision must be rejected by the database; Backend generates a new random ID and retries in a bounded/idempotent transaction/path.
- Never overwrite, merge, or reuse another physical PC's identity because of a collision.
- At 1,000,000 independently generated 128-bit IDs, the birthday-bound collision probability is approximately `1.5e-27` before the database uniqueness guard. Correctness still relies on the uniqueness constraint, not probability alone.
- The ID is opaque and must not encode hostname, fleet/site number, GPU, CPU, customer, Job, frame range, MachineGuid, motherboard/BIOS serial, fingerprint, or sequential Worker count.
- The ID is stable across normal reboot/reconnect and across Jobs.
- Scheduler ownership, heartbeat, Worker state, logs, task ownership and host accounting all use this one canonical ID.

Machine fingerprint is separate in **purpose**: it is enrollment/recovery security evidence and must never become a second PC identity or silently replace `worker_id`.

## Founder-approved canonical flow

`authorize site/fleet once -> unattended PC bootstrap -> machine fingerprint evidence -> Backend site-scoped authorization check -> Backend transactionally generates canonical PCID/Worker ID -> bounded bootstrap/enrollment material bound to site/fleet + Worker ID + fingerprint -> PC redeems -> Backend issues/accepts per-Worker credential according to the canonical enrollment contract -> credential stored with Windows DPAPI -> Node Agent authenticates -> heartbeat -> ACTIVE_IDLE`

Normal reboot/reconnect:

`load existing Worker identity + DPAPI credential -> Node Agent -> authenticate/heartbeat -> ACTIVE_IDLE`

Normal reboot MUST NOT call enrollment again when the credential is valid.

## Site/Fleet bootstrap authorization

Founder decision:

- Site/fleet onboarding happens once through an authenticated Backend boundary.
- Backend issues a **site-scoped bootstrap credential/capability** for that authorized site/fleet.
- The capability is NOT a Worker credential and NOT a Supabase service-role credential.
- It may authorize only bounded provisioning actions for its own site/fleet.
- It must have explicit scope and server-side authorization checks.
- It must support quota/rate limits as appropriate for the approved site/fleet size.
- It must support expiry and/or bounded validity, revocation, and auditability.
- Compromise of one site bootstrap capability must not grant Worker claim/render/payment/storage-master privileges or authority over another site/fleet.
- A Worker never receives or exposes the controller/site bootstrap credential as its long-term runtime identity.

The exact token representation and cryptographic implementation are implementation details, but the security properties above are binding.

## Worker ID generation owner

Backend is the canonical PCID/Worker ID generation owner.

Requirements:

- Worker ID is generated server-side inside the authoritative provisioning transaction/path.
- Worker ID is unique and stable for the physical Worker identity.
- Worker ID is not selected or typed by Founder/Admin/operator.
- Worker ID is not derived from hostname, GPU name, Windows MachineGuid, motherboard serial, BIOS serial, fingerprint, or a sequential counter exposed as identity.
- Worker ID is not generated per Job.
- Concurrent/retried provisioning must be idempotent and must not create duplicate active identities for the same authorized machine binding.
- Database uniqueness must be authoritative; random generation is not allowed to bypass the unique constraint.

`PCID/Worker ID`, `MachineGuid`, and `machine fingerprint` are distinct concepts by purpose. `PCID` and `Worker ID` are aliases of the same canonical value; MachineGuid/fingerprint are not that value.

## Machine fingerprint contract

Founder decision:

- Enrollment binding uses a **composite machine fingerprint**, not one mutable or spoofable attribute by itself.
- Fingerprint may combine multiple available device signals such as TPM/device identity evidence when available, Windows MachineGuid, motherboard/system/BIOS identifiers, and other bounded hardware/OS identifiers supported by the implementation.
- Raw identifying attributes must not become the canonical Worker ID.
- The fingerprint is evidence for enrollment binding, duplicate/replay detection, and recovery decisions; it is not the sole identity authority.
- Fingerprint material must be normalized deterministically before hashing/comparison.
- Prefer transmitting/storing the minimum necessary normalized/hash representation rather than broadly exposing raw machine identifiers.
- The contract must tolerate legitimate bounded changes where appropriate and define a recovery path instead of silently creating a second Worker identity.
- If authorization is absent or fingerprint binding fails, provisioning fails closed.

The exact attribute set/weights and tolerance rules must be grounded against what the supported Windows/BootROM environments can reliably provide before implementation is declared complete.

## Enrollment/bootstrap security invariants

- Existing one-time ticket/enrollment primitive may be reused internally.
- Any ticket/bootstrap artifact used for normal provisioning is issued automatically after authorized site/fleet bootstrap; humans do not copy it machine by machine.
- Bootstrap artifact is one-time or otherwise replay-resistant, bounded by expiry, and server-side revocable.
- Bootstrap material is bound to the authorized site/fleet and the intended Worker/machine binding.
- Ticket/bootstrap redemption is idempotent under safe retry but must reject replay after authoritative consumption.
- Stolen material from one machine/site must not provision an unrelated machine/site.
- No shared per-fleet Worker credential.
- No Supabase service-role key on Worker or site controller.
- No long-lived B2 master credential on Worker.
- Per-Worker credential creation/verification must follow the existing approved Backend enrollment contract; Backend stores only the required verifier/hash where applicable.
- Windows stores the Worker credential using the canonical DPAPI mechanism; do not print credential plaintext in logs.
- Production fails closed on missing/invalid authorization, fingerprint mismatch, replay, revocation, invalid binding, or duplicate identity conflict.

## Canonical runtime ownership

This spec does NOT change normal task execution ownership:

- Node Agent remains the single resident Windows supervisor.
- Worker Engine remains task-scoped and is launched only by Node Agent.
- Existing authenticated Backend Worker gateway remains authoritative.
- Existing PostgreSQL atomic claim, lease, generation fencing, retry/failover semantics remain unchanged.
- Worker provisioning is not performed per Job.
- AI/Founder/Admin are not dependencies in normal Worker runtime.

## Recovery path

Recovery/re-enrollment is exceptional, not a normal reboot path.

Allowed triggers include:

- Worker credential missing/corrupt;
- explicit credential revocation;
- authorized reprovisioning/hardware replacement;
- per-machine persistent state lost by BootROM/image reset;
- security incident requiring identity recovery.

Recovery must remain Backend-authorized and auditable. It must not silently fall back to MachineGuid as the canonical Worker ID and must not use recovery SQL/manual row creation as the normal provisioning path.

A legitimate hardware metadata change must not automatically create a second Worker ID. Recovery logic must reconcile evidence against the existing canonical identity or require an explicit authorized replacement path.

## Non-goals

This specification does not authorize:

- creating a second independent `PCID` namespace;
- assigning sequential PC numbers as canonical identity;
- changing Customer workflow;
- changing payment/pricing/storage ordering;
- changing Scheduler ownership, task claim, lease, or generation fencing;
- adding Redis, NATS, Kafka, RabbitMQ, or another broker/control-plane service;
- creating a new Vercel/Render/Supabase/B2 project/resource;
- making Worker Engine an always-running second service;
- cloning one Worker credential into a Golden Image;
- using hostname/GPU/MachineGuid/fingerprint directly as Worker ID.

## Smallest implementation slice approved now

1. Ground current enrollment controller/service, ticket schema/RPC, Worker identity bootstrap scripts, DPAPI store, production Node Agent, and current `workers.worker_id` constraints/validators.
2. Remove/supersede any active implementation path that requires a separate PCID or client/operator-generated Worker ID.
3. Add the smallest authenticated Backend site/fleet provisioning authorization boundary using existing infrastructure.
4. Add server-side transactional CSPRNG Worker ID allocation using 128-bit random IDs, canonical `cwsw_<32 hex>` representation unless current validated external constraints require a compatibility normalization.
5. Enforce/verify database uniqueness and bounded collision retry without overwriting another Worker.
6. Bind automatically issued bootstrap material to site/fleet + generated Worker ID + normalized fingerprint hash.
7. Update first-enrollment Worker bootstrap to request authorization, redeem once, persist the single canonical identity + DPAPI credential, then start Node Agent.
8. Remove MachineGuid-as-Worker-ID fallback from the canonical automatic path; keep MachineGuid only as bounded fingerprint/recovery evidence if justified.
9. Add targeted security/concurrency/replay/collision tests.
10. Run exactly ONE physical Worker through provisioning -> authenticated heartbeat -> ACTIVE_IDLE and STOP. Do not scale yet.

## Required verification before claiming production readiness

### Backend/code

- canonical `PCID = Worker ID`; no second active PCID namespace;
- 128-bit CSPRNG ID generation;
- canonical format validation;
- database uniqueness constraint verified;
- simulated/forced collision path rejects and safely retries without overwrite;
- unique Worker ID generation under concurrent/retried requests;
- same machine retry does not create a second active Worker identity;
- site/fleet scope isolation;
- quota/expiry/revocation enforcement;
- idempotent provisioning retry;
- replay rejection after redemption;
- fingerprint mismatch rejection;
- duplicate-machine/duplicate-active-identity prevention;
- no service-role or broad storage secret exposure.

### Worker

- first bootstrap requires valid bounded authorization;
- no operator-entered Worker ID/PCID;
- no separate PCID provisioning step;
- no MachineGuid identity fallback in canonical path;
- DPAPI persistence works under the intended Node Agent Windows identity;
- credential plaintext is not logged;
- Node Agent reaches authenticated heartbeat after successful provisioning;
- reboot/reconnect reuses existing identity without enrollment;
- revoked/missing/corrupt credential enters bounded recovery, not silent fallback.

### Scale/security

- 1, 100, 1,000, 10,000 and 1,000,000 logical Worker identities use the same generation/uniqueness contract without per-machine Founder ID entry;
- bulk/random-ID tests demonstrate no accepted duplicate IDs and database collision guard is exercised;
- revoking one Worker does not invalidate unrelated Workers;
- compromising one Worker does not expose site-controller authority;
- compromising one site-controller capability does not grant another site's authority or broad runtime/payment/storage privileges.

## Current 1-Worker production gate

The physical test PC currently lacks canonical identity/credential state. The next runtime objective is therefore:

`automatic first provisioning -> Backend-generated canonical PCID/Worker ID -> DPAPI credential -> CWSNodeAgentProduction -> authenticated heartbeat -> ACTIVE_IDLE -> STOP`

Do not start a second Worker until this gate passes and Founder explicitly allows scale-out.

## Evidence language

Implementation/tests alone may reach `CODE VERIFIED` or `INTEGRATION VERIFIED` only.

Production provisioning is not `PRODUCTION RUNTIME VERIFIED` until a real authorized physical Worker executes the canonical first-enrollment flow and subsequent reboot/reconnect successfully with current production Backend/database evidence.

Golden Customer E2E remains a separate verification gate.