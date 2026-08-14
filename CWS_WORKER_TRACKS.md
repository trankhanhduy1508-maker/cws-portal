# CWS Worker Tracks — Active

> Status: ACTIVE
> Founder decision: 2026-08-14
> Purpose: define the current roles of the two CWS Worker tracks without silently merging their architectures.

## Track A — Operational / Revenue Worker — CURRENT PRIORITY

The current Founder-priority Worker/render path is deliberately small:

`cws_worker.bat -> cws_worker_full.py -> Blender/Cycles -> validated render output -> B2 upload/delivery`

These two Worker files are the **current render core**. They are no longer legacy/reference-only for current operational work.

### Founder architecture clarification — 2026-08-14

For current rendering, do **not** insert Node Agent, Worker Engine, Windows service supervision, fleet heartbeat, provisioning, claim/lease/fencing, or another canonical renderer layer into the render core.

The boundary is:

**Render plane / render core now**

`cws_worker.bat -> cws_worker_full.py -> Blender/Cycles -> output validation -> B2`

Responsibilities include:

- launch the Worker reliably;
- obtain/prepare the intended render input under the approved controlled trust boundary;
- invoke Blender/Cycles correctly;
- render frames/chunks;
- detect failures accurately and recover from bounded failures;
- validate expected output;
- upload/deliver validated output to B2 when B2 is used;
- report useful render evidence/state;
- clean job-scoped temporary files without damaging the customer original.

**Outer control plane later**

Supabase/backend may later coordinate many Workers: job assignment, Worker/job state, orchestration, completion state, and related multi-worker control. That control plane is outside the two-file render core and must not replace it merely to perform rendering.

**Node Agent / Worker Engine**

Node Agent, Worker Engine, Windows-service supervision, heartbeat/presence, automated provisioning and fleet lifecycle remain separate future automation/research concerns. They are not dependencies of the current Track A render path.

Do not silently turn Track A into:

`Node Agent -> Worker Engine -> renderer -> Blender`

when the task is to make the Founder-approved operational render core work.

Current priority is functional reliability:

- start reliably on the Founder-controlled Windows machine;
- obtain the intended render input under the approved manual/controlled trust decision;
- prepare the intended working copy/workspace;
- invoke the intended Blender executable and render correctly;
- detect success/failure accurately;
- validate expected output;
- upload/deliver output only after validation when B2 is used;
- retry/recover from bounded failures;
- clean temporary/job-scoped files without damaging the customer original;
- produce useful logs/evidence for diagnosis.

### Track A trust boundary and proportional security posture

Track A is a **Founder-controlled concierge/operational path**, not the future public unattended multi-tenant Worker system.

Current trust model:

- Founder receives/controls the customer submission used for Track A;
- Founder decides what file/job is allowed to enter the Track A render machine;
- customer does not receive or operate `cws_worker.bat`, `cws_worker_full.py`, Worker credentials, or the render host;
- customer only receives the resulting output through the Founder-controlled delivery process;
- Track A may use manual Founder orchestration where this reduces friction and increases real-render/revenue learning.

Therefore, **functional reliability and smooth rendering outrank future-production hardening on Track A**.

AI/Codex MUST NOT make every production-grade automated/multi-tenant security control a blocker for Track A. A warning is not automatically a stop condition merely because the same design would be unacceptable for Track B.

Some Track A shortcuts or broader local capabilities may be intentionally accepted by the Founder when they materially reduce render friction inside this controlled trust boundary. Do not remove or redesign such behavior solely to satisfy future Track B security architecture. First ask: does the behavior create a real catastrophic risk inside the current Founder-controlled operating model, or is it mainly a future automation concern?

### Track A P0 safety floor — small and non-negotiable

Security is proportional, not disabled. Only catastrophic/irreversible risks should block Track A by default.

Minimum P0 floor:

- do not commit live secrets/credentials into the public/canonical Git repository;
- do not destroy, overwrite, or irreversibly modify the customer original;
- do not perform destructive host/data actions outside the intended Founder-approved render operation;
- do not report render/upload success when required output is missing, corrupt, or unverified;
- do not silently expose customer files or credentials to unnecessary third parties;
- surface material security findings to the Founder, but classify non-P0 hardening as deferred rather than automatically blocking operational rendering.

The following are **not automatic Track A blockers** merely because Track B will eventually require stronger treatment:

- manual Founder-controlled job/file selection;
- simplified local workspace assumptions;
- broader local permissions that are knowingly limited to the Founder-controlled render machine;
- manual configuration or operational steps;
- missing unattended multi-tenant isolation;
- missing full least-privilege automation;
- missing automatic provisioning/heartbeat/fencing architecture;
- security hardening whose main value appears only once unknown/untrusted parties can directly drive the Worker.

If a security change materially increases render complexity or failure risk while providing little benefit inside the current controlled boundary, prefer to **record/defer it for Track B** instead of forcing it into Track A.

### Track A engineering rule

For Track A, use this priority order:

`RENDER CORRECTLY -> RECOVER RELIABLY -> VERIFY OUTPUT -> UPLOAD/DELIVER -> KEEP P0 SAFETY FLOOR -> IMPROVE CONVENIENCE -> DEFER NON-ESSENTIAL HARDENING`

Do not turn Track A into a second Node Agent/Worker Engine architecture.

## Track B — Node Agent / Worker Engine Auto-E2E Research — SANDBOX / LATER

The Node Agent + Worker Engine architecture is retained as the **automated E2E / scale / unattended-worker research track**.

Current conceptual direction remains useful for future automation, but it is separate from the current render core.

Possible future concerns include Windows startup, authenticated presence, provisioning, fleet lifecycle, multi-worker scheduling and stronger unattended/public/multi-tenant security. Their eventual integration must preserve the Founder-approved render-core boundary unless the Founder explicitly changes it.

For now:

- preserve code/spec/tests/evidence;
- treat runtime experiments as sandbox/staging research;
- do not delete the track;
- do not force Track A to adopt the whole Track B architecture;
- do not report Track B code/tests as current operational runtime evidence;
- do not make Track B provisioning/heartbeat gates block Track A real-render experiments.

## Relationship between render plane and control plane

Current architecture intent:

`Control plane (later: Supabase/backend/multi-worker coordination)`

`        -> assigns/coordinates work`

`Render plane: cws_worker.bat -> cws_worker_full.py -> Blender/Cycles -> validated output -> B2`

The control plane may coordinate the render core; it must not be confused with or silently replace the render core.

Track A success does not prove future unattended/automated Golden E2E.

`TRACK_A_REAL_RENDER_PASS != FUTURE_GOLDEN_E2E_PASS`

## Current engineering priority

Until the Founder changes priority again:

1. audit `cws_worker_full.py` and `cws_worker.bat` as the active render core;
2. reproduce and fix real functional defects;
3. preserve only the small P0 safety floor appropriate to the Founder-controlled boundary;
4. verify Blender/Cycles frame/chunk rendering and automatic progression;
5. verify output integrity and B2 upload/delivery behavior;
6. learn from real customer/render evidence;
7. keep Supabase/backend multi-worker coordination outside the render core;
8. keep Node Agent/Worker Engine research preserved but secondary and non-blocking.
