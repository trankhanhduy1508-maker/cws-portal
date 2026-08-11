# Spec 008 — Standard Customer Workflow

## Goal
Make the Customer Portal follow one unambiguous production workflow beginning with customer Google authentication and ending with authorized result download. Admin/Host remains a core CWS component, but further Admin refinement is sequenced after the current Customer workflow bottleneck.

## Founder decision
Updated 2026-08-11:

1. Customer does **not** choose Economy / Balanced(Standard) / Priority / Turbo, Worker count, GPU or CPU.
2. After validated input, customer presses **Start render** and CWS automatically plans capacity.
3. CWS targets complete final output within an internal mandatory **45-minute scheduling budget**, including render plus required collection/validation and animation assembly/encode.
4. Scheduler does not wait for a dedicated benchmark-only phase. It starts useful production work immediately with an initial target of **10 eligible Workers** when capacity permits.
5. The first completed real Tasks/frames provide runtime evidence for the same Job.
6. If projected final completion threatens the 45-minute target, CWS scales the Job upward, potentially 10 -> 20 -> 30+ Workers, subject to eligible fleet capacity.
7. Capacity calculation adds a configurable safety margin initially in the **20–30%** range and rounds required Worker count **up** to a whole integer.
8. One Task/frame has one active authoritative owner at a time. Concurrent duplicate rendering of the same frame is forbidden in the normal path; failover remains controlled by lease/generation fencing.
9. Current MVP parallelism is across independent frames/tasks. Distributed tile/sample rendering of one single slow frame is a future decision, not part of this spec.

Admin remains important and will continue to be developed. For the current implementation cycle, prioritize the Customer MVP and adaptive scheduling path; resume non-blocking Admin refinement after the Customer workflow reaches its next production gate.

## Reality / current mismatch
Profile Gate Removal is now complete on canonical `main` after PR #31 merged with green frontend/backend CI. The Customer create-job path is profile-free; historical/internal profile identifiers remain only for compatibility where required.

The remaining mismatch is the adaptive Task Graph / Deadline Scheduler path:

1. Job creation still seeds a single probe task (`frame 1-1`) through `WorkerFleetGateway.createInternalJobWithProbeTask()`.
2. `SchedulerService` still waits for that probe task to finish before expanding frames `2..N` in fixed chunks, which conflicts with the approved work-conserving “start useful work immediately” direction.
3. The scheduler does not yet establish an initial desired parallel capacity of 10 eligible Workers for the same Job.
4. Real completed Tasks/frames are not yet used as runtime evidence for deadline projection.
5. The scheduler does not yet compute projected final completion against the 45-minute target with reserved finalization overhead and configurable safety capacity.
6. Existing durable PostgreSQL Task ownership, atomic claim, lease, generation fencing, retry/failover, and Worker security boundaries are already valuable and must be preserved rather than replaced.
7. Finalization/assembly/encode time is not yet explicitly budgeted as part of the 45-minute completion target.

These are now the current scheduling mismatches to converge. Do not reopen the completed public Render Profile gate while working on this slice.

## Canonical customer journey
`Google Login -> Submit input -> materialize/validate -> Start render -> create one Job -> analyze frame/work range -> create durable non-overlapping Tasks -> initial 10-Worker desired capacity -> real distinct task claims/render -> observe real task/frame runtimes -> adapt desired Worker count if 45-minute final-output target is at risk -> collect/validate -> animation assembly/encode when required -> B2 locked output -> 3–5 watermarked previews -> final price + payment reference + MB QR -> SePay exact verification -> PAID -> authorized download -> History`

## Scope
- Customer Portal is the current implementation focus.
- Keep Google login as the first operational gate.
- Keep Upload/Drive authenticated-only.
- Keep canonical materialized/validated customer-owned input mandatory before Job creation.
- Remove public Render Profile/Mode selection from the Customer journey.
- Remove obsolete Economy/Standard/Priority/Turbo as required public business choices.
- Preserve internal compatibility identifiers only if existing persisted data/contracts genuinely require them; do not keep them as a hidden required Customer choice.
- Customer presses one Start render action after input readiness.
- Create exactly one customer-owned Job after Start render.
- Analyze project/frame range and generate durable non-overlapping Tasks.
- Preserve PostgreSQL atomic claim + lease + generation fencing.
- Target initial desired capacity of 10 eligible Workers when runnable Tasks exist and fleet capacity permits.
- Start useful production work immediately; do not wait for a dedicated benchmark-only Worker.
- Record observed runtime from completed real Tasks/frames.
- Project final completion time from observed runtime, remaining work and finalization reserve.
- Increase desired Worker count when the 45-minute target is threatened.
- Apply configurable 20–30% safety capacity and round required Worker count up to an integer.
- Prevent concurrent duplicate active Task/frame ownership.
- Include collection/validation and animation assembly/encode in the deadline budget.
- Preserve output-before-payment order: render/finalize -> validate -> B2 full output locked -> previews -> final price/QR -> SePay -> download.
- Keep History/reattach behavior tied to the same real Job ID.
- Add regression/E2E coverage for the new screen/state and scheduling order.
- Update source-of-truth docs and engineering learning log.

## Non-goals for this implementation cycle
- Do not redesign Admin/Host in this change; this is sequencing, not abandonment.
- Do not delete, weaken, or de-scope the existing Admin/Host architecture or security requirements.
- Do not create new Vercel/Render/Supabase/B2 resources.
- Do not change payment method away from MB Bank QR + SePay.
- Do not invent a new pricing base rate.
- Do not add OneDrive/Dropbox/direct-link ingestion.
- Do not add customer GPU/CPU/Worker-count selection.
- Do not add a new Redis/broker/queue service without measured evidence.
- Do not replace PostgreSQL task ownership/lease/generation fencing.
- Do not implement distributed single-frame tile/sample rendering in this spec.
- Do not use speculative duplicate frame rendering in the normal path.

## Scheduling invariants

### Metadata discovery / first useful task
- Frame metadata discovery is a bounded preflight on the **first real render Task**, not a separate benchmark-only render phase and not a second customer-visible Job.
- The first Worker may open the project, read authoritative `frame_start`, `frame_end`, `total_frames` and `fps`, report that metadata through the existing authenticated Backend/Worker security boundary, and then continue useful rendering for its already-owned Task.
- The Scheduler must not wait for that first Task to finish rendering. As soon as authoritative metadata is durably recorded, it may create the remaining disjoint render Task graph.
- Metadata reporting must be fenced to the Worker/task/generation that currently owns the first Task; stale or unrelated Workers must not be able to set Job metadata.
- Do not add a separate benchmark Worker, new queue/broker, or Backend Blender runtime merely to discover frame metadata.
- The durable Job metadata must represent the actual frame interval, not only an assumed `1..N`; projects whose `frame_start` is not 1 must partition correctly.

### Task ownership
- Each render Task/frame has one active authoritative owner at a time.
- Claim must remain atomic.
- Lease/generation fencing remains authoritative for failover/retry.
- Reassignment after failure/expiry must not allow an old Worker to commit stale completion.
- Different Task IDs must not cover overlapping frame intervals for the same Job.
- For a Job frame interval `[S,E]`, the union of render Task ranges must equal exactly `[S,E]` with no gaps and no overlap.
- Task graph creation/expansion must have one authoritative writer/transactional path and be idempotent under Scheduler retries.

### Initial wave
- Desired initial parallelism is 10 eligible Workers when there are enough runnable Tasks and fleet capacity exists.
- If fewer than 10 eligible Workers exist, use available capacity and keep the Job observable as capacity-constrained; do not fabricate capacity.

### Runtime feedback
- Useful production Tasks provide benchmark evidence.
- Maintain enough observations to estimate current seconds/frame or task-runtime distribution without blocking the Job.
- Do not infer performance solely from GPU model/name when real runtime evidence exists.
- Existing telemetry/schema is not completion evidence by itself; adaptive scheduling must consume timestamps/events that the canonical production Worker path actually writes.

### Deadline planning
- Internal target: final validated deliverable within 45 minutes from render start.
- Projection must include remaining render work plus reserved finalization overhead.
- If projected completion exceeds target, increase desired capacity as eligible Workers are available.
- Safety margin is configurable, initially 20–30%.
- Required Worker count is an integer and rounds upward.
- Do not expose this formula as a Customer choice.

## Security / data invariants
- Customer identity and input ownership are server-side enforced.
- File extension alone is not trusted.
- Drive URL is an ingestion source, not a durable Worker dependency.
- Original customer input stays immutable.
- Untrusted Blender Python autoexec stays disabled.
- Full result remains locked until server-side `PAID`.
- Frontend local state never authorizes payment/download.
- Worker task ownership remains fenced through authenticated Backend/Postgres contracts.
- Frontend never calls Worker/Scheduler directly.

## Definition of Done
A real production customer can complete, in order:

1. Google login.
2. Authenticated Upload/Drive input.
3. Real canonical materialization/validation.
4. Start render without selecting a public speed tier.
5. Exactly one Job creation after input readiness.
6. Real project/frame-work analysis reports authoritative frame range/fps without waiting for a benchmark render to finish.
7. Durable non-overlapping Task generation covers the exact authoritative frame interval.
8. Initial real Worker wave begins useful work immediately after metadata makes runnable Tasks available, targeting 10 eligible Workers when capacity permits.
9. No two active Workers render the same Task/frame concurrently.
10. Real completed Tasks/frames produce runtime observations.
11. Scheduler projects final completion and can increase desired Worker capacity when the 45-minute target is threatened.
12. Safety capacity is applied and Worker target rounds upward to an integer.
13. Real Worker/Blender execution reports real progress.
14. Required collection/validation and animation assembly/encode finish before final-output completion is claimed.
15. B2 full output is locked before payment.
16. Real 3–5 watermarked previews are produced.
17. Final price + exact payment content + MB QR are produced.
18. Exact/idempotent SePay verification produces PAID.
19. Authorized download is issued.
20. Same Job is visible in History.

No mock/demo substitute counts as production evidence.
