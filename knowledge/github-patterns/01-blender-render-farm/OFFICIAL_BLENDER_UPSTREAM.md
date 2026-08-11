# Official Blender Upstream Source Pin for CWS

> Status: AUTHORITATIVE EXTERNAL SOURCE REFERENCE
> Snapshot: 2026-08-12
> Upstream: `blender/blender`
> Upstream default branch: `main`
> Pinned upstream commit at snapshot: `47f6b41f8e1f53d9ebef09d4d433ac44555f1e01`
> Purpose: give ChatGPT/Codex one canonical pointer to the official Blender source when CWS work depends on Blender behavior.

## Why this is a source pin instead of vendoring Blender into CWS

CWS does **not** copy the entire Blender source tree or add it as a production submodule.

Reasons:
- the official Blender repository is very large and unrelated to the CWS Vercel/runtime build graph;
- vendoring it would bloat CWS clones, CI and deployment context;
- a Git submodule could cause deployment/build systems to fetch a very large dependency even though CWS only needs Blender as reference knowledge;
- copying upstream code would introduce unnecessary maintenance and license-boundary complexity;
- CWS needs authoritative upstream behavior, not a frozen private fork unless the Founder explicitly approves one later.

Therefore this file is the **canonical upstream pointer**. When Blender behavior matters, AI must ground the current official upstream source before making a CWS implementation decision.

## Canonical official repository

`https://github.com/blender/blender`

Organization: `blender` (official Blender GitHub organization)

Primary role for CWS:
- `.blend` scene semantics;
- animation frame range/FPS behavior;
- Blender CLI/background execution;
- render engine contracts;
- EEVEE/EEVEE Next implementation;
- Cycles integration inside Blender;
- materials, textures, lights, shadows, compositor/output settings;
- Python API/runtime behavior;
- render tests and version migration behavior.

## Related official repository

`https://github.com/blender/cycles`

Use when the task is specifically about Cycles renderer internals, device backends, GPU/CPU capability, memory behavior, render kernels or Cycles-specific regression behavior.

## High-value official source paths for CWS

### EEVEE / EEVEE Next

`source/blender/draw/engines/eevee/`

Use for:
- EEVEE rendering behavior;
- GPU/render-pass behavior;
- lights/shadows/material evaluation;
- EEVEE-specific implementation details.

### Render engine contracts / pipeline

`source/blender/render/`

Use for:
- render engine lifecycle;
- frame execution pipeline;
- output/render result handling;
- generic render-engine contracts.

### Blender CLI / background execution

`source/creator/`

Use for:
- command-line arguments;
- background/headless behavior;
- frame/range parsing;
- process startup behavior.

### Cycles integration in Blender

`intern/cycles/`

Use for:
- Cycles Blender integration;
- device/backend behavior;
- sampling/performance settings;
- renderer-specific UI/API wiring.

### Official Cycles performance presets

`scripts/presets/cycles/performance/`

Notable current upstream examples:
- `Faster_Render.py`
- `Lower_Memory.py`
- `Default.py`

CWS must treat these as **version-specific upstream examples**, not universal presets to copy blindly.

### Render regression tests

`tests/files/render/`

Use to understand how Blender itself validates render behavior and version-specific regressions.

## CWS grounding rule

When a task depends on Blender semantics:

`active CWS spec -> current CWS implementation -> official Blender source -> CWS adaptation -> tests`

Do not rely on tutorials, forum posts or old remembered API behavior when official source can answer the question.

## Version rule

The snapshot commit above is for reproducibility only. It is **not permanently canonical**.

Before a material production decision:
1. determine the exact Blender version CWS Worker supports;
2. ground the corresponding upstream tag/commit or current official source;
3. compare behavior against CWS Worker assumptions;
4. add a regression test when the behavior matters to Customer output or Worker reliability.

## Security boundary

Official source is trusted as an authoritative reference, but CWS still must not:
- execute arbitrary scripts from upstream automatically;
- enable Python autoexec for untrusted customer `.blend` files;
- install Blender add-ons just because they are under the Blender organization;
- copy build scripts into CWS without review;
- mutate Customer artwork to match upstream examples.

## Priority for AI/Codex

For Blender-specific questions, source preference is:

1. official `blender/blender` source;
2. official `blender/cycles` when Cycles-specific;
3. Blender-maintained project/documentation such as Flamenco where relevant;
4. ASWF/render-farm references such as OpenCue;
5. high-quality community repositories;
6. blogs/tutorials/forums only as secondary context.

This ordering does not override Founder decisions or active CWS architecture.
