# 07 — Testing / Verification Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: frontend/backend/Worker tests, browser E2E, evidence levels, Golden E2E.

## Primary top-tier sources

### 1. `microsoft/playwright` — ~91k stars
https://github.com/microsoft/playwright

Cross-browser automation for Chromium, Firefox and WebKit on Windows/macOS/Linux.

CWS lessons:
- browser E2E should exercise user-observable behavior rather than internal component implementation;
- test real navigation, auth gates, uploads/forms, error states and browser behavior;
- automatic waiting/state-aware locators are preferable to arbitrary sleeps;
- traces/screenshots/network evidence are useful for diagnosing E2E failures;
- one E2E framework can cover desktop/mobile viewport behavior without duplicating test architecture.

### 2. `cypress-io/cypress` — ~49.7k stars
https://github.com/cypress-io/cypress

Mature browser/component testing project.

CWS lessons:
- deterministic fixtures and observable state are important;
- component tests and browser E2E solve different layers;
- debugging experience matters because flaky tests that cannot explain failure become ignored;
- tests should run as part of normal CI, not only manually before launch.

### 3. `vitest-dev/vitest` — major Vite-native test framework
https://github.com/vitest-dev/vitest

CWS already uses Vitest, so this source is directly relevant.

CWS lessons:
- keep fast unit/contract tests close to source;
- isolate deterministic logic such as validation, partitioning and capacity math;
- use mocks at unit boundaries without promoting mock results into production claims;
- test error paths and invalid states, not just happy paths.

## CWS verification principle

A test answers only the question it actually exercised.

Do not convert:

`unit test PASS`

into:

`production works`

CWS Harness evidence ladder remains:

1. `DESIGN REVIEWED`
2. `CODE VERIFIED`
3. `INTEGRATION VERIFIED`
4. `RUNTIME VERIFIED`
5. `PRODUCTION RUNTIME VERIFIED`
6. `GOLDEN E2E VERIFIED`

A lower level never implies a higher level.

## Recommended CWS test pyramid by function

### Deterministic unit tests

Best for:
- file/signature validation;
- frame partitioning;
- task-range overlap/gap checks;
- capacity formula/round-up;
- ETA projection math;
- payment reference parsing;
- state transition guards;
- output frame-set validation.

### Contract/service tests

Best for:
- DTO/API compatibility;
- auth/ownership;
- Worker RPC fencing;
- database RPC behavior;
- idempotency;
- webhook handling;
- B2 capability issuance.

### Integration tests

Best for:
- Backend + Postgres transaction behavior;
- task graph creation + claim;
- retry/reassignment;
- materialization/ownership path;
- output finalization path.

### Browser E2E

Best for:
- Google login gate behavior with controlled auth test strategy;
- upload/Drive UI;
- Start Render create-one-job behavior;
- progress/history/error recovery;
- payment/locked-download UI states.

### Worker runtime tests

Best for:
- JobSpec parsing;
- Blender metadata extraction;
- Worker process sequence;
- report/refresh/render ordering;
- cleanup;
- failure classification.

### Golden E2E

Only real full flow evidence can earn this label:

`real Customer input -> real Job -> real Scheduler -> real Worker/Blender -> real output -> real B2/preview/pricing -> real payment verification path -> authorized download`

Simulation cannot substitute.

## Flake-control rules

- no fixed sleeps when a real condition/event can be awaited;
- deterministic test IDs/locators for important UI controls;
- isolate external-network dependencies or label them explicitly as integration/runtime tests;
- retrying a flaky test is not a root-cause fix;
- record failed seed/input/log evidence;
- time-dependent scheduler tests should use controlled clocks where possible.

## Distributed-system tests CWS needs

- two claimers race for same Task -> one wins;
- two different Task IDs cannot cover same frame range after graph creation;
- stale generation cannot heartbeat/complete/fail;
- lease expiration/reassignment preserves logical task coverage;
- scheduler rerun is idempotent;
- Worker crash does not mark Task complete;
- finalization incomplete means Job not final;
- capacity unavailable is reported, not faked.

## Negative-path minimum

For every material gate, ask at least:
- malformed input?
- missing auth?
- wrong owner?
- timeout?
- retry?
- duplicate request?
- stale actor?
- external dependency failure?
- process crash?
- partial state from an older version?

## No-reboot testing rule

AI/Codex must never reboot/shutdown the Windows PC for tests. Any reboot/autostart property not proven without a Founder-approved natural test remains `NOT VERIFIED / DEFERRED`.

## What CWS should not copy blindly

- changing test framework just because another has more stars;
- enormous snapshot suites with low behavioral value;
- mocks for the very boundary being claimed as production verified;
- retries that hide nondeterministic bugs;
- browser E2E for logic more cheaply/precisely tested as pure functions.

## Activation

Load for test plans, CI evidence, E2E, flaky tests or completion claims. Keep existing Vitest/backend/Worker test stacks unless evidence justifies change.
