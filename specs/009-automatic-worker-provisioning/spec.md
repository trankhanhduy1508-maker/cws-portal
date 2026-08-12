# Spec 009 — Automatic Worker Provisioning

> Status: FOUNDER APPROVED — documentation/specification only. Implementation requires a separate bounded execution cycle.
> Date: 2026-08-12

## Goal

Make normal CWS Worker provisioning unattended after one authorized site/fleet onboarding, while preserving the existing Backend gateway, per-Worker credentials, Node Agent lifecycle, PostgreSQL claim/lease/generation fencing, and current infrastructure topology.

The operator must not manually choose Worker IDs, manually issue/copy one enrollment ticket per normal Worker, edit one Worker row per machine, or repeat enrollment per Job.

## Founder-approved canonical flow

`authorize site/fleet once -> unattended PC bootstrap -> machine fingerprint evidence -> Backend site-scoped authorization check -> Backend transactionally generates unique Worker ID -> bounded bootstrap/enrollment material bound to site/fleet + Worker ID + fingerprint -> PC redeems -> Backend issues per-Worker credential -> credential stored with Windows DPAPI -> Node Agent authenticates -> heartbeat -> ACTIVE_IDLE`

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

Backend is the canonical Worker ID generation owner.

Requirements:

- Worker ID is generated server-side inside the authoritative provisioning transaction/path.
- Worker ID is unique and stable for the physical Worker identity.
- Worker ID is not selected or typed by Founder/Admin/operator.
- Worker ID is not derived from hostname, GPU name, Windows MachineGuid, motherboard serial, BIOS serial, or fingerprint.
- Worker ID is not generated per Job.
- Concurrent/retried provisioning must be idempotent and must not create duplicate active identities for the same authorized machine binding.

`Worker ID`, `MachineGuid`, and `machine fingerprint` are distinct concepts.

## Machine fingerprint contract

Founder decision:

- Enrollment binding uses a **composite machine fingerprint**, not one mutable or spoofable attribute by itself.
- Fingerprint may combine multiple available device signals such as TPM/device identity evidence when available, Windows MachineGuid, motherboard/system/BIOS identifiers, and other bounded hardware/OS identifiers supported by the implementation.
- Raw identifying attributes should not become the canonical Worker ID.
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
- Worker creates a random per-Worker credential only according to the approved Backend enrollment contract; Backend stores only the required verifier/hash where applicable.
- Windows stores the Worker credential using the canonical DPAPI mechanism; do not print credential plaintext in logs.
- Production fails closed on missing/invalid authorization, fingerprint mismatch, replay, revocation, or invalid binding.

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

## Non-goals

This specification does not authorize:

- changing Customer workflow;
- changing payment/pricing/storage ordering;
- changing Scheduler ownership, task claim, lease, or generation fencing;
- adding Redis, NATS, Kafka, RabbitMQ, or another broker/control-plane service;
- creating a new Vercel/Render/Supabase/B2 project/resource;
- making Worker Engine an always-running second service;
- cloning one Worker credential into a Golden Image;
- using hostname/GPU/MachineGuid/fingerprint directly as Worker ID.

## Smallest implementation slice after approval to implement

1. Ground current enrollment controller/service, ticket schema/RPC, Worker identity bootstrap scripts, DPAPI store, and production Node Agent.
2. Add the smallest authenticated Backend site/fleet provisioning authorization boundary using existing infrastructure.
3. Add server-side transactional Worker ID allocation with retry/idempotency protection.
4. Bind automatically issued bootstrap material to site/fleet + generated Worker ID + normalized fingerprint hash.
5. Update first-enrollment Worker bootstrap to request authorization, redeem once, persist identity + DPAPI credential, then start Node Agent.
6. Remove MachineGuid-as-Worker-ID fallback from the canonical automatic path; keep only explicitly bounded recovery evidence if justified.
7. Add targeted security/concurrency/replay tests.
8. Stop before Scheduler, Customer, payment, storage-boundary, or infrastructure changes.

## Required verification before claiming production readiness

### Backend/code

- unique Worker ID generation under concurrent/retried requests;
- site/fleet scope isolation;
- quota/expiry/revocation enforcement;
- idempotent provisioning retry;
- replay rejection after redemption;
- fingerprint mismatch rejection;
- duplicate-machine/duplicate-active-identity prevention;
- no service-role or broad storage secret exposure.

### Worker

- first bootstrap requires valid bounded authorization;
- no operator-entered Worker ID;
- no MachineGuid identity fallback in canonical path;
- DPAPI persistence works under the intended Node Agent Windows identity;
- credential plaintext is not logged;
- Node Agent reaches authenticated heartbeat after successful provisioning;
- reboot/reconnect reuses existing identity without enrollment;
- revoked/missing/corrupt credential enters bounded recovery, not silent fallback.

### Scale/security

- 1, 100, and 1,000 normal Workers do not require per-machine Founder ID entry or manual ticket issuance;
- revoking one Worker does not invalidate unrelated Workers;
- compromising one Worker does not expose site-controller authority;
- compromising one site-controller capability does not grant another site's authority or broad runtime/payment/storage privileges.

## Evidence language

Implementation/tests alone may reach `CODE VERIFIED` or `INTEGRATION VERIFIED` only.

Production provisioning is not `PRODUCTION RUNTIME VERIFIED` until a real authorized site/Worker executes the canonical first-enrollment flow and subsequent reboot/reconnect successfully with current production Backend/database evidence.

Golden Customer E2E remains a separate verification gate.
