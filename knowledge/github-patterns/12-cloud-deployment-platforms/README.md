# 12 — Vercel / Render.com Deployment Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: Vercel customer/admin frontend deployment, Render.com backend deployment, previews, build/start contracts, environment variables, health/readiness, post-deploy verification and AI-agent operating boundaries.

## 1. Why Vercel and Render.com share one canonical note

CWS uses both as **deployment platforms**, so their knowledge belongs together rather than being scattered into duplicate platform files.

Current CWS stack facts from the repository:
- customer/admin web code is React + Vite, not Next.js;
- root build uses `vite build`;
- backend is NestJS/Node and production starts with `node dist/main`.

Therefore external platform examples must adapt to the current CWS stack rather than replace it.

This note does **not** authorize deployment, service restart, project creation, infrastructure creation, framework migration or environment-variable mutation.

---

# 2. Vercel — top-tier official GitHub sources

Official organization: https://github.com/vercel

## 2.1 `vercel/next.js` — ~140k stars
https://github.com/vercel/next.js

Why study it:
- Vercel's highest-star official web framework;
- mature patterns for React production behavior, builds, rendering, routing, security and release discipline;
- large security/advisory surface demonstrates why framework/runtime versions must be treated as production dependencies.

Critical CWS boundary:

> CWS currently uses **Vite + React**, not Next.js.

So `vercel/next.js` is **ecosystem/security/build knowledge only**. It is not permission to migrate CWS to Next.js or import Next-specific server/runtime assumptions.

What CWS should learn conceptually:
- production frontend behavior must be version-grounded;
- preview/build success is different from application correctness;
- framework/runtime security advisories require explicit dependency review;
- frontend server/client boundaries matter for secret exposure;
- deployment should be reproducible from canonical source rather than manual edits in production.

## 2.2 `vercel/turborepo` — ~30.5k stars
https://github.com/vercel/turborepo

High-performance JavaScript/TypeScript build system.

CWS lessons:
- builds can be modeled as a dependency graph;
- cacheability requires deterministic inputs/outputs;
- independent apps/packages should not rebuild unnecessarily;
- CI speed optimization must preserve correctness and dependency boundaries.

CWS restriction:
- do not introduce Turborepo solely because CWS contains customer/admin/backend code;
- current build tooling stays unless a measured build bottleneck justifies a separately approved change.

## 2.3 `vercel/vercel` — ~15k+ stars
https://github.com/vercel/vercel

Official Vercel platform/CLI repository — “Develop. Preview. Ship.”

This is the most directly useful Vercel deployment reference for current CWS.

CWS lessons:
- project linking, build configuration and environment scopes are deployment contracts;
- preview and production are distinct evidence levels;
- CLI/API automation should target the intended existing project, not silently create another project;
- deployment output/URL must be verified against the expected commit/source;
- environment variables must be scoped correctly and never copied into client bundles by accident.

Binding CWS adaptation:
- **do not create new Vercel projects unless Founder explicitly approves**;
- use existing canonical CWS project(s);
- deployment success alone is not Golden E2E.

## 2.4 Useful official supplements

### `vercel/examples` — ~5k stars
https://github.com/vercel/examples

Curated platform examples. Use only when the example matches the current CWS framework/runtime.

### `vercel/vercel-plugin`
https://github.com/vercel/vercel-plugin

Official Vercel ecosystem knowledge/skills plugin for AI coding tools.

What CWS should learn:
- keep default agent behavior lightweight;
- load platform skills only when task-relevant;
- separate environment-variable, deployment, verification and framework knowledge;
- specialized skills should not be auto-injected into every coding task.

This aligns with the CWS progressive-disclosure library, but installing the plugin is a separate tool/configuration decision and is **not authorized by this note**.

---

# 3. Render.com — official-source ranking needs an authority exception

Render.com does not expose one giant high-star open-source platform repository comparable to `vercel/next.js`. Searching raw GitHub stars for the word “render” returns many unrelated graphics/SSR projects.

Therefore CWS uses this order:

`official Render skills/examples -> exact CWS runtime relevance -> maintenance -> popularity`

Official sources are mainly under:
- https://github.com/render-oss
- https://github.com/render-examples
- https://github.com/renderinc

Low star count does **not** make an official platform contract less authoritative.

## 3.1 `render-examples/express-hello-world` — ~150+ stars, thousands of forks
https://github.com/render-examples/express-hello-world

Official minimal Node/Express web-service example.

Why relevant to CWS:
- CWS backend is a Node/NestJS web service;
- demonstrates the basic Render contract of explicit build and start commands;
- includes a `render.yaml` Blueprint example.

CWS lesson:

`canonical source -> deterministic build command -> deterministic start command -> platform runtime -> health/functional verification`

Do not copy its exact commands into NestJS. CWS already has its own backend build/start scripts and they remain authoritative.

## 3.2 `render-oss/skills` — official Render Agent Skills
https://github.com/render-oss/skills

A catalog of Render skills compatible with Codex and other AI coding tools, covering:
- deploy;
- Blueprints / `render.yaml`;
- web services;
- private services;
- static sites;
- background workers;
- cron/workflows;
- Docker;
- environment variables;
- networking;
- monitoring/debugging/scaling.

The repository uses a valuable structure:

`short task-specific SKILL.md -> deeper references`

This matches CWS progressive disclosure.

Most important governance lesson from Render's own skill system:
- read-only operations such as listing services/logs may be treated differently from mutations;
- infrastructure-changing actions still require explicit approval, including deploys, restarts, service creation/deletion and configuration/workspace changes.

CWS strengthens that boundary:
- no deploy/restart/service creation/deletion just because a skill recommends it;
- Windows **NO REBOOT** rule remains binding and unrelated to cloud service lifecycle;
- cloud production mutation requires the active CWS task to authorize it.

## 3.3 `render-examples/webhook-github-action`
https://github.com/render-examples/webhook-github-action

Official pattern for connecting Render deploy events to GitHub automation.

CWS lessons:
- deployment can emit an event that triggers post-deploy verification;
- webhook authenticity/signing and API credentials are security boundaries;
- secrets belong in platform/GitHub secret stores, never repository text;
- post-deploy test evidence should identify exactly which deployment/commit it verified.

Do not add this automation until CWS explicitly designs the deployment-verification workflow.

## 3.4 `render-examples/preview-environment`
https://github.com/render-examples/preview-environment

Official example defining frontend, backend and database in `render.yaml` and creating PR preview environments.

CWS lessons:
- preview environments can isolate change verification from production;
- infrastructure definition should be reviewable as code;
- preview data/resources must not be confused with production truth;
- ephemeral preview success does not prove production migration/data compatibility.

CWS does not automatically need a new preview database because Supabase is the current durable data platform.

## 3.5 Context-only official examples

`render-examples/fastapi`
https://github.com/render-examples/fastapi

Useful for generic Render service conventions, but **not a CWS implementation source** because CWS backend is NestJS/Node, not FastAPI/Python.

---

# 4. `render.yaml` / Blueprint principles for CWS

Render's official skills treat `render.yaml` as infrastructure configuration and support schema/CLI validation.

CWS rules:
- never guess a Blueprint field from memory when current Render schema/docs can be checked;
- build/start/health/env settings are production contracts;
- validate syntax/semantics before merge when Blueprint changes are active;
- immutable/resource-replacement implications must be identified before change;
- do not create Render Postgres/Key Value/queue-like infrastructure because examples support them — Supabase/Postgres remains CWS durable authority unless Founder approves otherwise;
- secrets must use Render environment configuration, not committed YAML values.

---

# 5. Deployment verification ladder

A platform saying “deployed” is not enough.

For either Vercel or Render.com, separate:

1. **BUILD VERIFIED** — canonical commit builds.
2. **DEPLOYMENT CREATED** — platform accepted/deployed artifact.
3. **HEALTH VERIFIED** — expected service/route responds.
4. **INTEGRATION VERIFIED** — frontend/backend/Supabase/B2 boundaries work for the tested path.
5. **PRODUCTION RUNTIME VERIFIED** — actual production deployment tested.
6. **GOLDEN E2E VERIFIED** — full CWS customer workflow succeeds end-to-end.

Never collapse these into one PASS.

---

# 6. Environment-variable / secret boundary

For both platforms:
- public frontend variables and server secrets are different trust classes;
- no Supabase service-role or B2 long-lived master credential in client-visible variables;
- environment names/scopes must be explicit;
- preview credentials must not silently point at production mutation authority unless deliberately designed;
- secret rotation must not require source-code edits;
- screenshots/logs/reports must redact secrets.

---

# 7. Codex / GPT reading path

When deployment is the active bottleneck:

1. read CWS Harness + active workflow/decision;
2. ground current `package.json`, backend scripts and existing platform configuration;
3. determine whether the task is **Vercel frontend** or **Render.com backend**;
4. load only the relevant section/source above;
5. distinguish read-only inspection from infrastructure mutation;
6. state exact existing project/service target before any write/deploy action;
7. verify commit/build/deployment/health/integration as separate evidence;
8. STOP before an unapproved architecture/infrastructure change.

For Blender rendering, do **not** use this folder. The canonical knowledge remains:

`knowledge/github-patterns/01-blender-render-farm/`

---

# 8. What CWS should NOT import blindly

- Next.js migration because it is Vercel's highest-star repository;
- Turborepo because monorepos are fashionable;
- new Vercel project when the existing canonical project should be updated;
- new Render service/project/database/Key Value resource without explicit need/approval;
- platform agent plugin/skills as higher authority than CWS Harness;
- automatic production deploy or restart merely to obtain evidence;
- production secrets copied into preview/client environments;
- a platform “success” badge as Golden E2E proof.

## Activation

Load this note only for Vercel/Render.com deployment, environment, preview, health, rollback or platform-agent work. It is reference knowledge; current CWS configuration and runtime evidence remain authoritative.
