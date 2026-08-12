# CURRENT_STATUS

## Current Phase
Customer MVP workflow convergence before Golden Production E2E.

## Founder Priority — 2026-08-12
Customer remains the highest-priority product path.

The immediate runtime bottleneck remains **automatic first provisioning of exactly one physical Worker through an already-approved site/fleet without repeated Founder/Admin authorization**.

Do not scale beyond one Worker until the 1-Worker provisioning/runtime gate passes.

## Canonical Customer Workflow — Updated 2026-08-12

The active Customer New Render initiation flow is now:

`Google Login -> authenticated Upload/Google Drive -> temporary quarantine/staging outside canonical B2 -> anti-malware + security/structural validation -> CLEAN/SAFE -> upload/promote canonical input to B2 -> verify object -> INPUT_SAFE -> automatically create exactly one customer-owned Job -> analyze/tasks/scheduler/render`

Two previous active ideas are superseded:

- `INPUT_READY -> customer presses Start render -> create Job`
- untrusted customer input is uploaded to canonical B2 quarantine before malware scanning.

Submitting a supported input while authenticated represents Customer render intent. There is no mandatory second `Start render` confirmation and no Founder/Admin approval between safe input acceptance and Job creation.

## Input Security Gate

No customer input may enter canonical B2 input storage and no production Job may be created before the mandatory pre-B2 security gate passes.

Customer input is hostile until it passes, as applicable:

- authenticated customer + server-side ownership;
- approved source/provider semantics;
- SSRF-aware Google Drive handling;
- bounded redirects/timeouts/size;
- extension + actual content/signature validation;
- anti-malware scan;
- ZIP/RAR traversal/bomb/resource/sandbox protections;
- Blender safety with untrusted Python autoexec disabled.

Verdict behavior:

- `CLEAN + all required structural checks PASS -> canonical B2 upload -> object verification -> INPUT_SAFE`;
- `INFECTED -> reject/isolate -> no canonical B2 upload -> no Job`;
- scanner unavailable/error/timeout/unknown -> fail closed -> no canonical B2 upload -> no Job;
- malformed input, unsafe archive, signature mismatch or another failed mandatory security check -> no canonical B2 upload -> no Job.

Canonical malware-scanning direction is a local/self-hosted implementation compatible with existing approved infrastructure; ClamAV is the first candidate to evaluate. Do not send private Customer project files to public scanning services without Founder approval.

CWS does not automatically disinfect/modify an infected customer project and continue rendering. Reject/isolate instead; automatic repair requires a separate Founder-approved design.

## Canonical B2 Input Rule

Canonical B2 input is **trusted-by-validation**, not the first landing zone for untrusted Customer content.

Canonical order:

`temporary quarantine -> security scan/validation -> CLEAN/SAFE -> canonical B2 upload -> integrity/ownership verification -> INPUT_SAFE`

Temporary quarantine must use existing approved infrastructure and remain inaccessible to Workers. Do not create a new bucket/service without Founder approval.

## Automatic Job Creation

Only authoritative `INPUT_SAFE` may trigger Job creation.

Backend must automatically create exactly one customer-owned Job for the accepted New Render submission intent, with:

- server-side ownership enforcement;
- canonical B2 input already verified;
- idempotency under retries/refresh/callback duplication;
- no duplicate Job from the same accepted submission;
- no frontend-forged `INPUT_SAFE`;
- no Job from quarantined/rejected/unknown-scan input;
- zero Founder/Admin approval.

## Customer Scheduling Direction

Customer render tier/speed choice remains removed.

Customer does not choose Worker count, GPU or CPU.

After automatic Job creation:

`authoritative work analysis -> durable non-overlapping Tasks -> initial desired capacity -> real Worker runtime evidence -> adaptive scale-up if <=45-minute final-output target is at risk -> render/finalize`

Post-Job Scheduler semantics remain sequenced behind the current 1-Worker production gate.

## Current Worker Identity / Provisioning Rules

`1 physical PC = 1 canonical PCID/Worker ID`

`PCID` is an alias of the same canonical `worker_id`; no second PC-ID namespace exists.

Backend generates the ID using 128-bit CSPRNG entropy, preferably:

`cwsw_<32 lowercase hex>`

Database uniqueness is authoritative; collisions retry without overwrite.

Machine fingerprint is enrollment/recovery evidence only.

## Approved Site/Fleet Autonomy

A site/fleet is approved once. Durable site trust survives individual short-lived provisioning-token expiry.

Canonical direction:

`site approved once -> durable site trust -> autonomous site-controller capability renewal -> unattended PC provisioning -> Backend-generated Worker ID -> per-Worker credential -> DPAPI -> Node Agent -> heartbeat -> ACTIVE_IDLE`

Founder/Admin must not authorize every normal PC or every new batch at an already-approved site.

## Verified Recent Worker State

- PR #37 automatic one-Worker provisioning was merged into `main`.
- Production Backend exposes the new worker provisioning routes and rejects unauthenticated access as expected.
- Production DB contains the Spec 009 rollout migrations 030/031/032.
- Code/test evidence for provisioning, fingerprint binding, DPAPI and collision/idempotency exists.
- Exact physical 1-Worker `authenticated heartbeat -> ACTIVE_IDLE` remains the production runtime gate.
- Golden Production E2E remains **NOT PROVEN**.

## Current Active Specs

- `specs/008-customer-standard-workflow/` — Customer workflow now requires temporary quarantine + pre-B2 malware/security validation + canonical B2 promotion + automatic Job creation after `INPUT_SAFE`.
- `specs/009-automatic-worker-provisioning/` — active 1-Worker runtime provisioning blocker.

## Next Required Convergence

Current sequencing:

`1 Worker autonomous provisioning/runtime PASS -> Founder review -> 1 Worker real Job/Task/render PASS -> Founder review -> 2–3 Workers -> 10 Workers -> adaptive scaling`

Customer input-security/automatic-Job implementation must be handled as a focused Spec 008 slice and must not weaken or bypass the 1-Worker runtime gate.

## Golden Production E2E

Still **NOT PROVEN**.

Builds, tests, merged PRs, deployed routes, migrations, scanner installation, historical Jobs or Worker heartbeat alone do not prove Golden Production E2E.

## Last Updated
2026-08-12 — Founder clarified the security order: Customer input must be scanned/validated in temporary quarantine before canonical B2 input upload. CLEAN/SAFE input is then canonicalized to B2, verified, marked `INPUT_SAFE`, and automatically creates exactly one Job with zero Founder/Admin approval.
