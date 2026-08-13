# CWS Engineering Workbench V1

> Status: proposed implementation branch, not merged to `main`.
> Purpose: reduce environment drift, hidden local assumptions, and AI-generated regressions without changing CWS production architecture.

## 1. Problem this solves

CWS now spans three materially different engineering surfaces:

1. Customer/Admin frontend.
2. Backend/API.
3. Native Windows Worker runtime (Node Agent -> Worker Engine -> Blender).

A single developer machine can appear healthy while using different runtime/tool versions from CI or production. At the time this document was created, the Founder workstation reported Node `24.19.0`, while canonical GitHub CI uses Node `22`. That is an environment-drift risk even when tests happen to pass.

The Workbench makes the expected development environment explicit and reproducible instead of relying on whatever versions happen to exist on one PC.

## 2. External engineering patterns adopted

CWS adopts the smallest useful subset of mature environment practices from the official VS Code, GitHub Codespaces and Development Containers ecosystem:

- repository-owned development-environment definition;
- pinned major runtime versions;
- deterministic dependency installation from lockfiles (`npm ci`);
- one repeatable local verification entry point;
- CI remains an independent second verification environment;
- native platform-specific runtime remains native when containerization would hide the real failure surface;
- production claims remain separate from local/CI success.

Primary references:

- VS Code Dev Containers: https://code.visualstudio.com/docs/devcontainers/create-dev-container
- GitHub Codespaces / dev containers: https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers
- Development Container Specification: https://containers.dev/

## 3. Canonical engineering split

### A. Reproducible web/backend environment

Use a repository-owned Dev Container for frontend/backend development and deterministic tooling.

Pinned baseline:

- Node.js major: `22` (matches current canonical GitHub CI).
- Python: `3.12` for shared tooling compatibility.
- dependency install: `npm ci` from committed lockfiles.

This environment is appropriate for:

- Customer frontend;
- Admin frontend;
- NestJS backend;
- unit/integration tooling that does not require native Windows Worker behavior;
- repository inspection and Codex implementation work.

### B. Native Windows Worker Test Bench

Do **not** treat a Linux development container as proof of Worker runtime correctness.

The following must remain verified on native Windows:

- DPAPI;
- Windows service/task behavior;
- Node Agent startup and singleton behavior;
- Worker Engine process ownership;
- filesystem/ACL behavior;
- Blender GPU/runtime behavior;
- native process cleanup;
- authenticated Worker heartbeat/claim;
- actual production-like Worker execution.

Canonical rule:

`Dev Container PASS != Windows Worker PASS != Production Runtime PASS`.

## 4. CWS development verification ladder

### W0 — Environment identified

Record:

- canonical repo;
- branch/SHA;
- Node version;
- npm version;
- Python version;
- operating system;
- worktree state.

### W1 — Toolchain aligned

Required development baseline matches repository pins.

A major-version mismatch is reported before implementation. It must not be silently ignored merely because existing tests pass.

### W2 — Local code verification

Run the repository verification command(s):

- frontend tests;
- frontend build;
- Admin build;
- frontend lint;
- backend build/tests/lint check;
- on Windows, Worker compile/tests.

### W3 — Git diff review

Before commit/PR:

- inspect full diff;
- confirm only intended files changed;
- confirm no secrets/generated artifacts were added;
- confirm workflow/architecture/security boundary deviation YES/NO.

### W4 — CI verification

GitHub CI reruns independently from the developer workstation.

Local PASS cannot substitute for CI PASS.

### W5 — Runtime verification

When the task affects real runtime, verify the relevant actual process/service/environment.

CI PASS cannot substitute for runtime evidence.

### W6 — Production / Golden E2E

Use the existing CWS Harness evidence ladder. Nothing in the Workbench changes the definition of `PRODUCTION RUNTIME VERIFIED` or `GOLDEN E2E VERIFIED`.

## 5. AI / Codex operating rule

Before coding in VS Code/Codex:

1. open the canonical repository only;
2. confirm current branch and main SHA;
3. run environment identification;
4. report runtime-version drift;
5. create/use a focused branch;
6. implement one approved bottleneck;
7. run local verification;
8. inspect complete diff;
9. create commit/PR only after verification;
10. do not merge/deploy/migrate production unless separately authorized.

An AI agent must not repair a failing verification gate by weakening tests, changing product workflow, or introducing new infrastructure.

## 6. Version pinning rule

Repository pins define the expected development baseline.

Initial pins in this Workbench branch:

- `.nvmrc` -> Node `22`;
- `.python-version` -> Python `3.12`;
- `.devcontainer/devcontainer.json` -> Node 22 + Python 3.12 environment.

Future version changes are deliberate engineering changes and should be reviewed like dependency/runtime upgrades. Do not silently follow the newest locally installed runtime.

## 7. Dependency rule

For frontend/backend CI-like setup, prefer lockfile-based installation:

`npm ci`

Do not replace this with an unconstrained dependency refresh merely to make one workstation pass.

Dependency upgrades should be separate, reviewable changes.

## 8. One-command verification

`scripts/verify-workbench.ps1` is the Windows-local verification entry point.

It intentionally:

- fails if Node major is not 22;
- fails if Python is not 3.12;
- runs frontend tests/build/Admin build/lint;
- runs backend build/tests and a non-fixing lint check;
- runs Worker compile/tests only on Windows;
- reports git status at the end.

It does not deploy, migrate, reboot, shut down Windows, modify production data, or claim runtime/production verification.

## 9. What CWS should NOT adopt now

Do not add merely because large companies use them:

- Kubernetes;
- a new CI platform;
- a new cloud development service as a required dependency;
- Redis/NATS/Kafka/RabbitMQ;
- containerization of the production Windows Worker path;
- broad monorepo tooling/framework migration;
- mandatory Codespaces usage.

The Dev Container is an optional reproducibility layer for development, not a new production dependency.

## 10. Definition of success

Workbench V1 is useful when:

- a fresh compatible machine can identify the expected toolchain from the repo;
- frontend/backend can be opened in a reproducible Dev Container;
- local verification has one deterministic entry point;
- local/CI version drift becomes visible before coding;
- Worker-specific proof remains native Windows;
- no production architecture, workflow, security boundary, payment behavior, or infrastructure resource changes.

## 11. Rollout

1. Review this branch and repository pins.
2. On the Founder workstation, install/select Node 22 without removing unrelated runtimes if avoidable.
3. Run `scripts/verify-workbench.ps1` on the canonical local repo.
4. Optionally verify the Dev Container separately if Docker/Dev Containers is available; Docker is not required for the first rollout gate.
5. Confirm GitHub CI remains PASS.
6. Only then consider merging the Workbench branch.

STOP if toolchain alignment requires destructive machine changes or if Worker native behavior would be hidden by containerization.
