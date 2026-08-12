# CURRENT_STATUS

## Current Phase
Customer MVP workflow convergence before Golden Production E2E.

## Founder Priority — 2026-08-12
Customer remains the highest-priority product path, but the immediate runtime bottleneck is now **automatic first provisioning of exactly one physical Worker**. Do not scale to multiple Workers until the 1-Worker provisioning/runtime gate passes.

Admin/Host is not abandoned and not de-scoped. It remains a core CWS operational product surface and continues after the current Customer/Worker production gate.

## Current Founder Decision — One Physical PC = One Canonical PCID/Worker ID
For the current CWS machine model:

`1 physical PC = 1 canonical PCID/Worker ID`

`PCID` is an alias for the same canonical `worker_id`; there is no second independent PC-ID namespace.

Binding identity rules:
- Backend generates the ID during authorized first provisioning.
- ID uses 128 bits of cryptographically secure random entropy.
- Preferred representation: `cwsw_` + 32 lowercase hex characters.
- Database uniqueness/primary-key enforcement is mandatory; a rejected collision must generate a new ID and retry without overwriting another Worker.
- ID is opaque and is not derived from hostname, GPU, MachineGuid, fingerprint, serial number, Job, customer, site counter, or sequential PC number.
- Machine fingerprint remains enrollment/recovery evidence only.
- Same canonical ID is used for heartbeat, Worker state, logs, Scheduler/task ownership and host accounting.
- Normal reboot/reconnect reuses the existing ID + DPAPI credential.

Any legacy design that treats PCID and Worker ID as separate identifiers is superseded as active guidance.

## Customer Automatic Deadline Scheduling
The former customer render speed/tier feature remains removed.

Customer target workflow remains:

`Google Login -> Submit input -> materialize/validate -> Start render -> one customer-owned Job -> automatic work analysis -> durable non-overlapping Tasks -> initial desired capacity -> observed real task/frame runtimes -> adaptive scale-up when <=45-minute final-output target is at risk -> render/finalize -> B2 locked output -> previews -> final price + MB QR -> SePay -> PAID -> download -> History`

However, multi-Worker/adaptive expansion is currently sequenced behind the 1-Worker production gate.

## Current Task
`specs/009-automatic-worker-provisioning/`

Reason: the real physical 1-Worker pilot found no canonical Worker identity or DPAPI credential on the test PC, so Node Agent could not authenticate/heartbeat. This is the current direct runtime blocker.

## Verified Current State
- Customer Login Gate: implemented/synced.
- Customer Input Validation Gate: implemented/synced to canonical paths.
- Customer render speed/tier runtime cleanup: merged in PR #33; CI passed.
- Task Graph foundation: merged in PR #36.
- Production `expand_job_task_graph` migration: applied and production `report_job_metadata(...)` verified against merged contract.
- Exact 1-Worker runtime pilot: **BLOCKED before Node Agent start because identity/credential is missing**.
- Canonical Node Agent service path exists; the physical test showed the service stopped because enrollment/credential readiness failed closed.
- Golden Production E2E: still **NOT PROVEN**.

## Current Runtime Blocker
The physical test PC reported missing canonical identity/credential state. Do not bypass this with manual Worker ID, manual per-machine ticket, manual SQL identity fabrication, or MachineGuid-derived identity.

Required path:

`authorized site/fleet bootstrap -> automatic PC bootstrap -> composite fingerprint evidence -> Backend generates canonical PCID/Worker ID -> bounded enrollment material -> per-Worker credential -> DPAPI -> CWSNodeAgentProduction -> authenticated heartbeat -> ACTIVE_IDLE`

## Next Required Convergence
1. Ground current enrollment/ticket/Worker identity code and live schema constraints.
2. Implement the Founder-approved Spec 009 automatic provisioning slice using existing infrastructure only.
3. Ensure `PCID = Worker ID` and eliminate any active second-PCID/client-generated-ID path.
4. Generate 128-bit CSPRNG Worker IDs server-side and enforce database uniqueness + bounded collision retry.
5. Bind provisioning to authorized site/fleet + composite fingerprint evidence.
6. Persist the single canonical identity and machine-bound credential with DPAPI.
7. Start exactly one canonical Node Agent and verify authenticated production heartbeat + `ACTIVE_IDLE`.
8. STOP and report 1-Worker gate evidence.
9. Only after Founder approval: continue one-Worker real Job/Task/render verification, then 2–3 Worker concurrency, then 10-Worker/adaptive scaling.

## Scale Gate
Current approved sequence:

`1 Worker provisioning/runtime PASS -> Founder review -> 1 Worker real Job/Task/render PASS -> Founder review -> 2–3 Workers -> 10 Workers -> adaptive scaling`

Do not jump directly to 10 Workers.

## Sequenced After Current Gate
- Continue multi-Worker Scheduler/adaptive scaling convergence.
- Continue Admin UI/OAuth/MFA refinement.
- Continue Windows reboot/auto-start persistence verification after first canonical identity is successfully provisioned.

## Golden Production E2E
Still **NOT PROVEN**. Build/test/deployment state alone does not establish Golden E2E.

Implementation must follow the CWS grounding/Spec Kit/Harness rules, use only existing approved infrastructure, preserve claim/lease/generation fencing, and collect real production evidence.

## Last Updated
2026-08-12 — PR #36 Task Graph merged and production migration applied; physical 1-Worker pilot exposed missing canonical identity/credential as the active blocker. Founder then unified PCID and Worker ID into one Backend-generated 128-bit random canonical identity. Spec 009 is now the immediate runtime task.