# CWS Minimum Release Process V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CWS reach first paid/customer render by enforcing one P0 critical path, parking non-revenue work, and automating the minimum repeatable release gates.

**Architecture:** This is an operating-process change, not a runtime architecture change. `CWS_MINIMUM_RELEASE_PROCESS_V1.md` owns the temporary pre-revenue rules; existing CWS governance remains authoritative for Founder/security boundaries. Implementation is incremental: route agents to the minimum process, classify current work, then improve only release automation required by the current P0.

**Tech Stack:** GitHub repository governance, GitHub Actions/current CI, Python/pytest, Node package-manager scripts already present in the repository, Windows MAY083 controlled runtime, existing CWS Worker/Guard mechanisms.

## Global Constraints

- Critical path before first revenue: Track A + proven Security/Data P0 + minimum release automation only.
- WIP limit: one active P0 Ship Goal.
- Do not change workflow, architecture, scheduler semantics, database architecture, payment, authentication, production security boundary, render semantics, or multi-machine assignment architecture without Founder approval.
- Do not create a new Worker source file per Job/customer.
- Reuse current CI, tests, scripts, branches, PRs, and CWS mechanisms before creating new ones.
- Do not auto-merge.
- Preserve evidence levels and already-verified runtime boundaries.

---

### Task 1: Route Agent Sessions Through the Minimum Release Process

**Files:**
- Modify only the smallest existing bootstrap/router entry files necessary after inspection, likely `CWS_SESSION_BOOTSTRAP.md` and/or `CWS_KNOWLEDGE_ROUTER.yaml`.
- Reference: `CWS_MINIMUM_RELEASE_PROCESS_V1.md`

**Interfaces:**
- Consumes: current bootstrap/router governance precedence.
- Produces: agents discover the pre-revenue critical-path rule without reading a second full governance stack unnecessarily.

- [ ] **Step 1: Inspect bootstrap/router references**

Read current `CWS_SESSION_BOOTSTRAP.md` and `CWS_KNOWLEDGE_ROUTER.yaml`; identify the single smallest routing point that can reference `CWS_MINIMUM_RELEASE_PROCESS_V1.md` for pre-revenue engineering execution.

- [ ] **Step 2: Verify current behavior lacks an explicit minimum-release route**

Search both files for `CWS_MINIMUM_RELEASE_PROCESS_V1`. Expected before change: no active routing reference.

- [ ] **Step 3: Add the minimum reference**

Add only a concise rule equivalent to: while pre-revenue mode is active, engineering execution must load `CWS_MINIMUM_RELEASE_PROCESS_V1.md`; it does not override Founder-controlled boundaries.

- [ ] **Step 4: Validate routing syntax/content**

Parse YAML if the router is modified and inspect the Markdown diff. Expected: valid YAML, no unrelated routing changes.

- [ ] **Step 5: Commit**

Commit only the bootstrap/router routing change with a focused governance message.

### Task 2: Classify Current Work as CRITICAL or PARKED

**Files:**
- Modify: existing canonical current-status/task owner only after grounding, preferably `CURRENT_STATUS.md` rather than creating another status system.
- Reference: `CWS_MINIMUM_RELEASE_PROCESS_V1.md`

**Interfaces:**
- Consumes: current open PRs, current P0 evidence, current status.
- Produces: one visible active P0 and a compact Parking Lot classification.

- [ ] **Step 1: Ground current open work**

List current relevant PRs/branches/tasks and identify which directly serves Track A, a proven Security/Data P0, or minimum release automation.

- [ ] **Step 2: Assign exactly one current P0**

Use runtime/security evidence, not convenience. If the tracked B2 credential P0 remains open, it preempts Track A until safely closed; otherwise return to the nearest Track A blocker.

- [ ] **Step 3: Mark non-critical work PARKED**

Record only concise references/names. Do not delete branches or close PRs in this task.

- [ ] **Step 4: Verify WIP invariant**

Expected: exactly one active P0 Ship Goal; optional parallel read/research work cannot be a critical-path dependency.

- [ ] **Step 5: Commit**

Commit the minimal current-status update.

### Task 3: Close the Current Proven Security P0

**Files:**
- Inspect/modify only current Track A launcher/secret-loading files proven relevant.
- Existing likely mechanisms: `worker/enroll_worker_identity.ps1`, `worker/enroll_worker_identity.py`, `worker/windows_credential_store.py`, `worker/canonical_worker_launcher.py`, `cws_worker.bat`.
- Test: existing Worker/security regression suites.

**Interfaces:**
- Consumes: current tracked B2 credential finding and existing CWS secret-safe mechanism.
- Produces: tracked Worker path contains no live B2 credential and runtime uses approved secret-safe distribution.

- [ ] **Step 1: Prove current exposure without printing secret values**

Determine whether credential material remains in current HEAD/history and whether the credential is active where safely testable.

- [ ] **Step 2: Write/confirm a regression test or deterministic secret check**

Expected before remediation: the check fails on tracked live credential material without echoing the secret.

- [ ] **Step 3: Reuse the existing CWS secure credential path**

Do not invent a parallel store. Configure the smallest least-privilege runtime path.

- [ ] **Step 4: Rotate/revoke compromised credential through official provider mechanism when authenticated access permits**

If one unavoidable human authorization is required, stop for exactly that action. Never paste a secret into chat/logs/source.

- [ ] **Step 5: Remove active credential material from tracked Worker files**

Do not rewrite Git history as part of this task.

- [ ] **Step 6: Run targeted Worker/security tests**

Expected: secret regression check PASS and affected Worker tests PASS.

- [ ] **Step 7: Runtime verify secret loading/B2 authorization on the controlled path**

Expected: replacement mechanism authorizes the minimum required operation without tracked plaintext credentials.

- [ ] **Step 8: Commit**

Commit only the security remediation and regression protection.

### Task 4: Restore the Minimum Deterministic CI Gate

**Files:**
- Inspect existing `.github/workflows/*`, backend/frontend package manifests and lockfiles, Worker test configuration.
- Modify existing CI only if a required repeatable P0 gate is missing.

**Interfaces:**
- Consumes: repository lockfiles/scripts and existing CI.
- Produces: affected-subsystem checks run deterministically without Founder remembering setup commands.

- [ ] **Step 1: Inventory existing CI commands**

Map current Python compile/tests, Worker tests, frontend tests/build, backend tests/build, secret/integrity checks.

- [ ] **Step 2: Restore dependencies through lockfile contracts**

For backend/frontend only when required, use the package manager and lockfile already committed. Missing `node_modules` is setup, not a product bug.

- [ ] **Step 3: Run existing gates locally/CI-equivalent**

Expected: record exact PASS/FAIL for affected subsystems.

- [ ] **Step 4: Add only a missing repeatable critical gate**

Do not create a new CI framework. Prefer editing an existing workflow/job.

- [ ] **Step 5: Re-run and verify**

Expected: deterministic gate catches the relevant failure class and passes known-good code.

- [ ] **Step 6: Commit if and only if CI changed**

No documentation-only commit is required when existing automation is already sufficient.

### Task 5: Return to Track A Real Frame Boundary

**Files:**
- Current Track A Worker/render/analyzer files only if runtime evidence proves a code change is necessary.
- Runtime: `C:\CWS_Render` on MAY083.

**Interfaces:**
- Consumes: nearest verified real-customer checkpoint.
- Produces: one representative real frame rendered and validated through current Track A.

- [ ] **Step 1: Recover existing frame-288 evidence**

Do not repeat Drive acquisition/preflight/optimization if unchanged and already runtime verified.

- [ ] **Step 2: Capture the first failing boundary**

Collect exact Blender error, actual Cycles backend, RAM and VRAM evidence sufficient for one hypothesis.

- [ ] **Step 3: State one falsifiable hypothesis**

Format: `HYPOTHESIS: <cause> because <evidence>`.

- [ ] **Step 4: Make one smallest reversible change/test**

Preserve autoexec OFF, customer original, render semantics, and visual intent.

- [ ] **Step 5: Retest frame 288 from nearest safe checkpoint**

Expected PASS: actual backend identified, frame completes, image exists/non-zero/structurally valid, CWS validation accepts it.

- [ ] **Step 6: Run targeted regression tests**

Expected: no regression of earlier verified boundaries.

- [ ] **Step 7: Commit code only if code changed**

If runtime/config alone solved the blocker, record evidence in the existing canonical owner rather than inventing a code commit.

### Task 6: Prove Two-Worker Authoritative Task Separation

**Files:**
- Existing Job/Task claim/lease/generation code and tests only.

**Interfaces:**
- Consumes: current canonical scheduler/task ownership semantics.
- Produces: runtime/contract evidence that two Workers process distinct eligible Tasks and cannot both authoritatively complete the same Task.

- [ ] **Step 1: Run existing claim/lease/generation tests**

Expected: atomic ownership/fencing tests PASS or expose the first failure.

- [ ] **Step 2: Add one failing regression test only if a gap is proven**

Test the exact duplicate-ownership/completion scenario; do not redesign scheduler semantics.

- [ ] **Step 3: Apply minimum fix if needed**

If the required fix changes scheduler semantics rather than implementing the existing contract, stop for Founder approval.

- [ ] **Step 4: Run a controlled two-Worker test**

Expected: Worker A and Worker B claim distinct eligible Tasks; stale/losing owner cannot authoritatively complete the winner's Task.

- [ ] **Step 5: Commit if code/tests changed**

Do not scale beyond two Workers.

### Task 7: Prove Durable Output and Data-Driven Job Path

**Files:**
- Existing Drive/input controller, Job/Task creation, Worker acquisition, output validation, and B2 path only.

**Interfaces:**
- Consumes: one canonical Worker implementation plus per-job Job/Task/config data.
- Produces: new customer input requires no Worker source edit and validated output reaches durable storage.

- [ ] **Step 1: Verify input-to-Job/Task data path statically and with existing tests**

Expected: Drive/input data is stored on Job/Task records consumed by the Worker.

- [ ] **Step 2: Prove no per-customer Worker source generation/edit is required**

Expected: one canonical Worker consumes different Job/Task data.

- [ ] **Step 3: Run one minimal durable-output test**

Expected: validated render output uploads through the existing B2/storage path and completion is not reported before validation/upload success.

- [ ] **Step 4: Fix only the first failing boundary if necessary**

Preserve current storage/scheduler architecture.

- [ ] **Step 5: Commit only if implementation changed**

### Task 8: Closed-Loop Customer-Like Job and Known-Good Freeze

**Files:**
- No code changes expected unless the closed-loop test proves a new P0.
- Update the existing canonical current-status/evidence owner after PASS.

**Interfaces:**
- Consumes: Tasks 3–7 verified boundaries.
- Produces: reproducible pre-revenue MVP baseline ready for first paid/customer render.

- [ ] **Step 1: Run one small customer-like closed-loop Job**

Path: `INPUT -> JOB/TASKS -> WORKER OWNERSHIP -> REAL BLENDER RENDER -> OUTPUT VALIDATION -> DURABLE STORAGE`.

- [ ] **Step 2: Verify no false-success/duplicate authoritative completion**

Expected: every promoted state has runtime evidence.

- [ ] **Step 3: Record exact evidence ceiling**

Do not label GOLDEN E2E or PRODUCTION RUNTIME unless that exact environment/path ran.

- [ ] **Step 4: Create a known-good tag/checkpoint only under existing GitHub governance**

Do not auto-merge or release if Founder approval is required.

- [ ] **Step 5: Update current status minimally**

Record PASS, remaining commercial/revenue gap, and next smallest action: first paid/customer render.

## Plan Self-Review

- Coverage: critical path, WIP=1, Security P0 interrupt, minimum CI, Track A frame, two-Worker separation, durable output, data-driven jobs, closed-loop freeze are covered.
- No new runtime architecture is introduced.
- No per-job Worker source generation is introduced.
- No new skill/framework is required for product runtime.
- PARKED work is not deleted.
- Founder-controlled boundaries remain intact.
- Implementation steps use existing mechanisms first and stop at approval boundaries.
