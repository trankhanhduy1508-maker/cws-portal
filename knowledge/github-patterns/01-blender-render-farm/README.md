# 01 — Blender / Render Farm Patterns for CWS

> Status: TASK-RELEVANT REFERENCE
> Snapshot: 2026-08-12
> CWS mapping: Blender metadata/preflight, frame/task partitioning, render execution, Worker allocation, farm-scale scheduling.

## Official upstream first

For any Blender-specific behavior, first read the canonical official source pin:

`knowledge/github-patterns/01-blender-render-farm/OFFICIAL_BLENDER_UPSTREAM.md`

It points to the official `blender/blender` repository, records a reproducible upstream commit snapshot, maps the source paths most relevant to CWS, and requires re-grounding the exact supported Blender version before material production decisions.

CWS intentionally does **not** vendor the entire Blender source tree or add it as a production submodule because that would unnecessarily bloat clone/CI/deployment context. The official upstream remains the authority; CWS stores the source pin and distilled CWS rules.

## Specialist references

For Blender EEVEE / EEVEE Next work, also read:

`knowledge/github-patterns/01-blender-render-farm/EEVEE_RENDERING.md`

For customer `.blend` optimization work — textures, materials, geometry, lights, shadows, Cycles/EEVEE performance and memory pressure — also read:

`knowledge/github-patterns/01-blender-render-farm/BLEND_FILE_OPTIMIZATION.md`

The optimization note separates safe operational optimizations from quality-sensitive/destructive changes. It requires an immutable customer original and does **not** authorize automatic art-direction changes, render-engine switching, destructive decimation, texture downscaling, light deletion or shadow reduction.

## Primary top-tier sources

### 1. `blender/blender` — official Blender mirror — ~18.7k stars
https://github.com/blender/blender

Why trusted:
- official verified Blender organization;
- authoritative implementation of Blender scene, animation, rendering and Python behavior;
- active upstream development happens at `projects.blender.org`; GitHub is an official mirror.

What CWS should learn:
- actual Blender scene semantics instead of guessing file behavior;
- `frame_start`, `frame_end`, FPS and animation/render settings are project metadata and must not be assumed to start at frame 1;
- command-line/background execution and Python API behavior should be grounded in Blender itself;
- untrusted project Python autoexec is a security boundary, not a convenience toggle;
- scene preparation, compositing and output settings can affect finalization semantics.

Do not copy:
- Blender internals into CWS;
- assumptions from one Blender version without testing the supported production version;
- GUI-oriented behavior into headless Worker logic.

### 2. `AcademySoftwareFoundation/OpenCue` — render-management system — ~952 stars
https://github.com/AcademySoftwareFoundation/OpenCue

Why trusted:
- Academy Software Foundation project;
- originated from Sony Pictures Imageworks' in-house render manager and documents use across hundreds of films;
- purpose-built for VFX/animation render farms;
- active security/governance/docs structure.

What CWS should learn deeply:
- Job -> smaller work units/tasks rather than treating a render as one monolith;
- resource-aware dispatch and machine eligibility;
- central scheduling independent of the artist workstation;
- many concurrent hosts are normal, not an exception;
- farm capacity is a scheduling resource that must be observable;
- host/task state must remain explicit and durable;
- booking/resource allocation and task decomposition are separate concerns;
- large farms need failure containment rather than manual machine babysitting.

CWS adaptation:
- CWS should learn the **render-management primitives**, not install OpenCue wholesale;
- keep CWS PostgreSQL task authority, lease/generation fencing and Backend gateway;
- CWS has a different product objective: aggressively allocate enough useful Workers to drive final deliverable toward <=45 minutes.

### 3. `blender/cycles` — official Cycles render engine mirror — ~595 stars
https://github.com/blender/cycles

Why trusted:
- official Blender organization mirror;
- authoritative Cycles renderer source and build/test material;
- explicitly supports CPU and multiple GPU backends.

What CWS should learn:
- renderer/device capability is heterogeneous;
- GPU backend compatibility is a real eligibility condition, not just “GPU present”;
- render regression testing can be device-specific;
- production render behavior has memory/device constraints that scheduler capability matching must respect;
- CWS should treat VRAM/OOM/device errors as explicit Worker/task failure evidence.

## Additional mature farm reference

`CGRU/cgru` / Afanasy — ~302 stars
https://github.com/CGRU/cgru

Afanasy is a long-running render-farm manager with thousands of commits. It is useful as a secondary comparison for farm/task/host concepts and DCC integration. It is not an automatic dependency candidate.

## Authoritative non-GitHub supplement

Blender's own **Flamenco** render-farm project is maintained at Blender's project infrastructure rather than a canonical official GitHub repository. Because this library is GitHub-focused, it is not counted as one of the GitHub primary three. When CWS later studies Blender-specific render-farm behavior, Flamenco should still be consulted as an authoritative Blender supplement.

## CWS rules extracted from these sources

### A. Discover metadata, then create deterministic coverage

For one animation Job with authoritative range `[S,E]`:

- every renderable frame belongs to exactly one durable Task;
- Task ranges are disjoint;
- the union of ranges equals exactly `[S,E]`;
- retries/reassignment change attempt/ownership, not frame coverage;
- Scheduler must never create two different Task IDs whose frame ranges overlap.

This goes beyond atomic claim: atomic claim prevents duplicate ownership of one Task ID, but cannot repair a bad task graph such as `[1..10]` plus `[8..17]`.

### B. Work-conserving metadata discovery

CWS Founder decision:

- no benchmark-only Worker;
- first real render Task may perform bounded metadata preflight;
- report authoritative scene range/FPS as early as possible;
- continue useful real rendering;
- Backend can expand durable task coverage without waiting for that first frame to finish.

### C. Separate scheduling facts

Do not mix these concepts:

1. **Work definition** — which frames/tasks exist.
2. **Ownership** — which Worker has the authoritative lease/generation.
3. **Eligibility** — can this Worker actually render this Job safely?
4. **Capacity target** — how many Workers should be useful now?
5. **Runtime evidence** — what actual task durations show.
6. **Deadline projection** — how much capacity is needed for final output target.

### D. Prefer real runtime evidence over paper GPU estimates

GPU model/VRAM can filter eligibility, but once CWS has real completed task/frame durations for the customer's actual project, those observations should dominate runtime projection.

### E. Final frame completion is not necessarily final Job completion

Animation may require:

`render frames -> collect/validate -> assemble/mux/encode -> verify final deliverable`

The 45-minute internal target includes required finalization.

## Things CWS should NOT adopt from farm projects without a new decision

- a new queue/broker/database merely because OpenCue uses different infrastructure;
- a second scheduler authority;
- speculative duplicate frame rendering;
- artist-selected machine count/hardware;
- manual host assignment as normal operation;
- distributed single-frame tile/sample rendering in the current MVP.

## Activation checklist for Codex

Read this note when working on:
- Blender metadata extraction;
- frame partitioning;
- Task Graph;
- Worker device eligibility;
- render task failure semantics;
- Adaptive Deadline Scheduler.

For any Blender-semantic question, read `OFFICIAL_BLENDER_UPSTREAM.md` first.

If the task is EEVEE/EEVEE Next specific, also read `EEVEE_RENDERING.md` in this folder.

If the task is customer `.blend` optimization, texture/material pressure, geometry complexity, lights/shadows, Cycles/EEVEE performance or memory pressure, also read `BLEND_FILE_OPTIMIZATION.md` in this folder.

Before code, still ground active CWS spec/schema/Worker implementation. External patterns are reference only.
