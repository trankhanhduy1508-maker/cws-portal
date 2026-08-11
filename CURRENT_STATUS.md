# CURRENT_STATUS

## Current Phase
Customer MVP workflow convergence before Golden Production E2E.

## Founder Priority — 2026-08-11
Customer is the **current highest-priority product bottleneck**. Continue the Customer Portal from Customer Google Login through real render/payment/download before spending another long cycle on non-blocking Admin polish.

Admin/Host is **not abandoned and not de-scoped**. It remains a core CWS operational product surface and will continue to be developed after the Customer workflow reaches its next production gate. The separate Admin site and its security requirements remain active.

## Current Founder Decision — Adaptive Deadline Scheduling
The previous public Economy / Balanced(Standard) / Priority / Turbo render-mode choice is superseded.

Customer now follows:

`Google Login -> Submit input -> materialize/validate -> Start render -> one customer-owned Job -> automatic work analysis -> durable non-overlapping Tasks -> initial 10-Worker wave -> observed real task/frame runtimes -> adaptive scale-up when <=45-minute final-output target is at risk -> render/finalize -> B2 locked output -> previews -> final price + MB QR -> SePay -> PAID -> download -> History`

Binding points:
- customer does not choose speed tier, Worker count, GPU or CPU;
- initial runnable wave targets 10 eligible Workers when capacity permits;
- no dedicated benchmark-only wait phase;
- first completed real Tasks/frames are measurement evidence;
- Scheduler scales the Job upward (10 -> 20 -> 30+ as needed/capacity permits) if projected final completion threatens 45 minutes;
- safety capacity is configurable, initially 20–30%, and required Worker count rounds **up** to an integer;
- one active authoritative owner per Task/frame; no concurrent duplicate frame rendering;
- 45-minute target includes required collection/validation and animation assembly/encode, not frame render alone;
- distributed single-frame tile/sample rendering is not current MVP scope.

## Current Task
`specs/008-customer-standard-workflow/`

Ground and implement the next smallest slice of the automatic deadline-planning workflow: adaptive Task Graph / Deadline Scheduler behavior, without redesigning the Worker security/ownership architecture.

## Verified Current State
- Customer Login Gate: implemented/synced.
- Customer Input Validation Gate: implemented/synced to canonical paths.
- Production Node Agent code: synced.
- Windows auto-start/reboot persistence verification: deferred; not a blocker for the current Customer workflow slice.
- Golden Production E2E: still **NOT PROVEN**.

## Current Workflow Mismatch To Remove
The obsolete public Render Profile gate has been removed from the Customer path. Historical/internal profile identifiers remain only where required for compatibility with persisted history and legacy estimate/storage contracts; the Customer create-job payload is profile-free.

The remaining workflow mismatch is the not-yet-converged adaptive Task Graph / Deadline Scheduler path.

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

The next implementation must follow the Spec Kit/Ray Dalio funnel, run frontend + backend CI, deploy only the existing `cws-portal` project when the Customer slice is ready, and gather real customer/Worker/B2/SePay evidence.

## Last Updated
2026-08-11 — Founder replaced public render speed modes with CWS Adaptive Deadline Scheduling targeting complete final output within 45 minutes using immediate initial 10-Worker work plus runtime-driven scale-up.
