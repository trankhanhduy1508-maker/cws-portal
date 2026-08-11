# CURRENT_STATUS

## Current Phase
Customer MVP workflow convergence before Golden Production E2E.

## Founder Priority — 2026-08-11
Customer is the **current highest-priority product bottleneck**. Continue the Customer Portal from Customer Google Login through real render/payment/download before spending another long cycle on non-blocking Admin polish.

Admin/Host is **not abandoned and not de-scoped**. It remains a core CWS operational product surface and will continue to be developed after the Customer workflow reaches its next production gate. The separate Admin site and its security requirements remain active.

## Current Founder Decision — Automatic Deadline Scheduling
The former customer render speed/tier feature is removed entirely from the active product contract.

Customer now follows:

`Google Login -> Submit input -> materialize/validate -> Start render -> one customer-owned Job -> automatic work analysis -> durable non-overlapping Tasks -> initial 10-Worker wave -> observed real task/frame runtimes -> adaptive scale-up when <=45-minute final-output target is at risk -> render/finalize -> B2 locked output -> previews -> final price + MB QR -> SePay -> PAID -> download -> History`

Binding points:
- customer does not choose a render speed/tier, Worker count, GPU or CPU;
- active UI/API/domain/persistence must not require or recreate a customer tier identifier;
- initial runnable wave targets 10 eligible Workers when capacity permits;
- no dedicated benchmark-only wait phase;
- first completed real Tasks/frames are measurement evidence;
- Scheduler scales the Job upward as needed/capacity permits if projected final completion threatens 45 minutes;
- safety capacity is configurable, initially 20–30%, and required Worker count rounds **up** to an integer;
- one active authoritative owner per Task/frame; no concurrent duplicate frame rendering;
- 45-minute target includes required collection/validation and animation assembly/encode, not frame render alone;
- distributed single-frame tile/sample rendering is not current MVP scope.

## Current Task
`specs/008-customer-standard-workflow/`

Converge the automatic deadline-planning workflow without redesigning the Worker security/ownership architecture.

## Verified Current State
- Customer Login Gate: implemented/synced.
- Customer Input Validation Gate: implemented/synced to canonical paths.
- Customer render speed/tier runtime feature cleanup: **MERGED to canonical main in PR #33; GitHub CI #711 PASS**.
- Obsolete DB column removal: migration exists in main but is **NEEDS_PRODUCTION_APPLICATION/VERIFICATION**; code merge alone does not prove the live Supabase schema changed.
- Production Node Agent code: synced.
- Windows auto-start/reboot persistence verification: deferred; not a blocker for the current Customer workflow slice.
- Golden Production E2E: still **NOT PROVEN**.

## Current Workflow Mismatch To Remove
Customer render resource selection is fully automatic at the active code/API boundary. Do not recreate a customer tier/profile gate.

The next scheduling bottleneck remains the not-yet-converged adaptive Task Graph / Deadline Scheduler path after the preceding metadata/runtime gate is verified at the required evidence level.

## Next Required Convergence
1. Preserve validated/materialized customer-owned input as the only allowed input to Job creation.
2. Create exactly one Job after Start render.
3. Analyze frame/work range and create durable non-overlapping Tasks.
4. Preserve PostgreSQL atomic claim + lease + generation fencing.
5. Establish initial desired parallel capacity of 10 eligible Workers when possible.
6. Capture real task/frame runtime observations from useful work already being rendered.
7. Compute projected final completion with reserved finalization overhead.
8. Scale desired Worker count upward when the 45-minute target is threatened, with configurable 20–30% safety capacity and integer round-up.
9. Never allow concurrent duplicate active Task/frame ownership.
10. Continue through real render/finalization, B2 lock, previews, pricing/payment and delivery.

## Sequenced After Current Customer Gate
- Continue Admin UI refinement.
- Continue Admin OAuth/MFA UX verification and polish.
- Further Admin operational features according to the roadmap.
- Windows reboot/auto-start persistence verification for Node Agent.

This sequencing does not make Admin or auto-start architecture optional; it only keeps the current bottleneck focused.

## Golden Production E2E
Still **NOT PROVEN**. Do not claim PASS from build/test/deployment state alone.

Implementation must follow the CWS grounding/Spec Kit execution rules, run frontend + backend CI, use only existing approved infrastructure, and gather real customer/Worker/B2/SePay evidence.

## Last Updated
2026-08-11 — Customer render speed/tier runtime feature removed from canonical main via PR #33; CI passed. Live DB migration and Golden Production E2E remain separate verification gates.
