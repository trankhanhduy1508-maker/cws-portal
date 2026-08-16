# CURRENT_STATUS

## Current Phase
Customer MVP + Founder-controlled operational render convergence before Golden Production E2E.

## Founder Priority — 2026-08-14
The current Worker execution priority has changed.

**Track A — Operational / Revenue Worker is now the active priority:**

`cws_worker.bat -> cws_worker_full.py -> Blender/render/output handling`

These files are no longer treated as legacy/reference-only for current operational work. They are the Founder-controlled Worker path to be audited, repaired, and used for real rendering/revenue learning.

**Track B — Node Agent + Worker Engine is retained as sandbox/staging research for future automated E2E, unattended operation, scale, and Golden E2E.**

Track B is not the current blocker for today's operational/revenue work and its provisioning/heartbeat gate must not block Track A experiments.

See `CWS_WORKER_TRACKS.md` for the active role boundary and Track A proportional-security rule.

## Operational Worker Trust Boundary / Security Posture

Track A is Founder-controlled concierge operation, not a public unattended multi-tenant Worker path.

Current operating assumption:

- Founder receives/controls the customer file/job used for Track A;
- customer does not receive or operate the Worker files, credentials, or render host;
- Founder controls when/what is rendered and what output is delivered;
- smooth, reliable rendering and real operational/revenue evidence are the primary optimization goals today.

Therefore non-essential future-production hardening must **not** automatically block Track A.

Some simplified or broader local behavior may be intentionally accepted when it reduces render friction inside this controlled boundary. AI/Codex should flag material findings, but should distinguish:

- **P0 CURRENT RISK** — credible catastrophic/irreversible risk inside the Founder-controlled Track A model; may block until resolved;
- **DEFERRED HARDENING** — primarily needed for future unattended/public/multi-tenant Track B; record it, but do not automatically block Track A rendering.

Track A P0 safety floor remains small:

- do not commit live secrets/credentials into the canonical/public repo;
- customer originals must not be destroyed/overwritten/irreversibly modified;
- no destructive host/data action outside the intended Founder-approved render operation;
- no false render/upload success when required output is missing/corrupt/unverified;
- do not silently expose customer files or credentials to unnecessary third parties.

Missing full least-privilege automation, unattended isolation, automatic provisioning, heartbeat/fencing, or other Track B hardening is **not by itself a Track A blocker**.

If a proposed security hardening materially increases render complexity/failure risk while adding little safety inside the current controlled boundary, defer it to Track B and prioritize functional reliability.

## Canonical Customer Workflow — Updated 2026-08-12

The active Customer New Render initiation flow remains:

`Google Login -> authenticated Upload/Google Drive -> temporary quarantine/staging outside canonical B2 -> anti-malware + security/structural validation -> CLEAN/SAFE -> upload/promote canonical input to B2 -> verify object -> INPUT_SAFE -> automatically create exactly one customer-owned Job -> analyze/tasks/scheduler/render`

Two previous active ideas are superseded:

- `INPUT_READY -> customer presses Start render -> create Job`
- untrusted customer input is uploaded to canonical B2 quarantine before malware scanning.

Submitting a supported input while authenticated represents Customer render intent. There is no mandatory second `Start render` confirmation and no Founder/Admin approval between safe input acceptance and Job creation.

For the Founder-controlled Track A operational bridge, manual orchestration may temporarily replace parts of the automated downstream Worker path while the canonical automated flow continues to exist as future Track B work. A Track A pass must not be reported as Golden E2E.

## Input Security Gate

No customer input may enter canonical B2 input storage and no production Job may be created before the mandatory pre-B2 security gate passes in the canonical automated customer flow.

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

Temporary quarantine must use existing approved infrastructure and remain inaccessible to automated Workers. Do not create a new bucket/service without Founder approval.

## Automatic Job Creation

Only authoritative `INPUT_SAFE` may trigger Job creation in the canonical automated Customer flow.

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

The automated scheduler/Node Agent/Worker Engine path is preserved as Track B research and is currently secondary to Track A operational rendering.

## Current Worker Track State

### Track A — ACTIVE PRIORITY

Files:

- `cws_worker_full.py`
- `cws_worker.bat`

Current task:

`RENTED_MACHINE_GUARD_V1 bundle/update code verified -> physical Windows Guard lifecycle + process-policy + RELEASE verification`

Engineering priority:

`RENDER CORRECTLY -> RECOVER RELIABLY -> VERIFY OUTPUT -> KEEP P0 SAFETY FLOOR -> IMPROVE CONVENIENCE -> DEFER NON-ESSENTIAL HARDENING`

Do not redesign Track A into the whole Node Agent/Worker Engine architecture merely for parity or future security posture.

### Track B — SANDBOX / RESEARCH

Components include:

- Node Agent;
- Worker Engine;
- automatic approved-site provisioning;
- authenticated heartbeat / `ACTIVE_IDLE`;
- atomic claim / lease / generation fencing;
- unattended automated E2E;
- stronger future unattended/public/multi-tenant security hardening.

Code/test evidence exists, but physical production runtime remains unverified. This is preserved for future research and no longer blocks Track A.

## Current Active Specs

- `specs/008-customer-standard-workflow/` — canonical automated Customer workflow.
- `specs/009-automatic-worker-provisioning/` — Track B automated Worker provisioning research/spec; preserved but not today's execution priority.

## Next Required Convergence

Current sequencing for today:

`package/upload one versioned Worker + Guard bundle -> controlled physical Windows Guard verification -> harmless real render -> real controlled render/output -> operational learning/revenue evidence`

Track B can resume later under explicit Founder reprioritization.

## Golden Production E2E

Still **NOT PROVEN**.

A Track A Founder-controlled real render is operational/revenue evidence, not Golden Production E2E.

Builds, tests, merged PRs, deployed routes, migrations, scanner installation, historical Jobs or Worker heartbeat alone do not prove Golden Production E2E.

## Last Updated
2026-08-16 — RENTED_MACHINE_GUARD_V1 Worker/Guard bundle and fail-safe update contract are code verified in Cloud; real Windows popup/process/RELEASE/update behavior still requires the controlled physical-host procedure in `reports/worker/RENTED_MACHINE_GUARD_V1.md`.
