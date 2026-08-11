# Blender Customer File Optimization Patterns for CWS

> Status: TASK-RELEVANT SPECIALIST REFERENCE
> Snapshot: 2026-08-12
> Scope: safe/conditional optimization of customer `.blend` projects before or during render execution, including textures, materials, geometry, lights, shadows, Cycles/EEVEE settings, memory pressure and animation reuse.
> Activation: load only when the active CWS task involves Blender preflight/optimization, render-performance tuning, texture/material pressure, geometry complexity, lighting/shadow cost or renderer-specific performance.

## 1. Purpose

CWS wants to make customer Blender projects render faster, but optimization must not silently become visual redesign.

The governing rule is:

> **Optimize the derived working copy, preserve the customer original, and never trade correctness/appearance for speed without an explicit quality policy.**

This note studies high-signal GitHub projects and extracts patterns. It does **not** authorize installing their add-ons, changing the customer's artistic intent, switching render engines, or destructively rewriting the source `.blend`.

Precedence remains:

`Founder decision -> DECISIONS.md -> active spec/workflow -> current CWS code/schema/runtime evidence -> tests -> this note`

---

# 2. Source ranking

“Top-star” is used as a popularity/community signal, but relevance and authority still matter. A popular library for game-asset compression is not automatically safe for offline customer renders.

## Primary top-star sources

### 1. `blender/blender` — official Blender mirror — ~18.5k+ stars

Repository: https://github.com/blender/blender

Why it is the primary authority:
- official Blender organization mirror;
- authoritative implementation of scene/render settings, Cycles/EEVEE behavior, modifiers, textures, lighting, shadows and command-line/background execution;
- ships built-in Cycles performance presets, including `Faster_Render.py` and `Lower_Memory.py`;
- therefore CWS should first learn what Blender itself considers performance/memory trade-offs before copying third-party “optimizer” scripts.

Important upstream evidence:

Blender's current `Faster_Render.py` preset enables automatic threads and persistent render data and adjusts Cycles acceleration settings for a speed-oriented profile.

Blender's `Lower_Memory.py` preset turns persistent data off and uses more memory-conservative acceleration settings.

CWS lesson:

> **Render speed and memory pressure are a trade-off. There is no single global “best” preset. Worker eligibility and project complexity must drive the choice.**

Do not blindly copy Blender's internal/debug preset fields across versions. Ground the exact supported Blender version first.

---

### 2. `zeux/meshoptimizer` — ~7.7k stars

Repository: https://github.com/zeux/meshoptimizer

Purpose:
- mesh optimization;
- vertex/index processing efficiency;
- simplification/LOD;
- storage reduction;
- GPU-oriented rendering efficiency.

What CWS should learn:
- geometry complexity has multiple costs, not just polygon count;
- simplification should be measurable and bounded;
- optimization order matters;
- geometry transformation must preserve required attributes/material boundaries/animation behavior;
- “smaller mesh” and “same rendered image” are not equivalent claims.

Critical CWS restriction:

`meshoptimizer` is primarily a general GPU/mesh optimization library, not a `.blend` render-farm optimizer. CWS should learn its **measurement and simplification concepts**, not automatically run `gltfpack` or rewrite customer meshes.

Automatic destructive geometry simplification is **not approved** for normal CWS renders.

---

### 3. `DLR-RM/BlenderProc` — ~3.6k stars

Repository: https://github.com/DLR-RM/BlenderProc

Purpose:
- procedural Blender rendering pipeline;
- structured scene loading;
- materials/textures;
- lights;
- render configuration;
- repeatable headless scene processing.

What CWS should learn:
- scene preparation should be modular and deterministic;
- material, texture and lighting operations should be separate stages, not one giant “optimize scene” mutation;
- Blender automation should expose explicit inputs/outputs and be repeatable;
- repeated renders benefit from constructing a controlled scene-processing pipeline rather than scattered one-off Python mutations;
- lighting/material inspection can be automated without immediately altering the customer's artistic intent.

CWS adaptation:

`inspect -> classify -> plan -> selectively optimize -> render`

not:

`open file -> mutate everything -> hope it looks the same`

---

## Specialized high-signal supplements

### `BinomialLLC/basis_universal` — ~3k stars

Repository: https://github.com/BinomialLLC/basis_universal

What it teaches:
- texture compression is a quality/size/runtime trade-space;
- mipmaps, HDR/LDR, alpha and GPU texture formats must be treated explicitly;
- compression requires measurable quality constraints.

CWS restriction:
- Basis/KTX2 is very useful for GPU texture distribution and real-time engines, but it is **not automatically a Blender offline-render speedup**;
- Blender may still decode textures into GPU memory, so file-size reduction must not be confused with guaranteed Cycles/EEVEE render-time reduction;
- do not convert customer textures to KTX2/Basis in the current render path unless Blender-version/runtime evidence proves a benefit and visual equivalence is protected.

### `franMarz/TexTools-Blender` — ~2.4k stars

Repository: https://github.com/franMarz/TexTools-Blender

What it teaches:
- mature UV/texture workflows;
- texture baking and atlas-oriented operations;
- consistent texel/UV handling;
- texture operations should be explicit tools with visible scope.

CWS lesson:
- texture optimization is not simply “resize every image to 2K”;
- UV scale, texture role, alpha, normal maps, displacement and camera distance all affect whether downscaling is safe.

### `ucupumar/ucupaint` — ~2.2k stars

Repository: https://github.com/ucupumar/ucupaint

What it teaches:
- layered texture/material workflows for both EEVEE and Cycles;
- material complexity and texture layers are engine-relevant scene structure;
- material conversion/flattening requires awareness of renderer semantics.

CWS lesson:
- never flatten or merge arbitrary material nodes solely because two materials look “similar” by name;
- exact semantic equivalence must be established before deduplication.

### `Moo-Ack-Productions/MCprep` — ~363 stars — specialized render-setting evidence

Repository: https://github.com/Moo-Ack-Productions/MCprep

It is not top-three by stars, but it is directly useful because it documents practical Cycles tuning such as:
- disabling reflective/refractive caustics for speed;
- tuning light sampling threshold;
- reducing max bounces;
- enabling Blender Simplify;
- warning that aggressive simplification can affect shadows/reflections around transparent textures.

CWS lesson:

> **A performance toggle is only “safe” relative to a visual-quality contract.**

Do not copy MCprep's Minecraft-specific values into arbitrary customer projects.

### `NVIDIA-Omniverse/blender_omniverse_addons` — vendor-authoritative scene-optimizer supplement

Repository: https://github.com/NVIDIA-Omniverse/blender_omniverse_addons

Its Scene Optimizer includes mesh cleanup, bad-geometry correction, UV generation and proxy/collision-oriented processing.

CWS lesson:
- optimization should be decomposed into independent optional operations;
- each operation needs its own preconditions and rollback/verification;
- vendor authority can be more useful than star count for a narrow subsystem.

---

# 3. CWS optimization model

CWS should separate **analysis** from **mutation**.

## Phase A — Optimization Inventory

Before changing a derived working copy, collect facts such as:

### Project/render facts
- Blender version required by the file;
- render engine: Cycles / EEVEE / other;
- frame range/FPS;
- resolution and percentage;
- sample/noise/denoise settings;
- compositor usage;
- color management;
- persistent-data setting;
- output format.

### Texture/material facts
- number of image textures;
- total source texture bytes;
- dimensions per texture;
- bit depth / HDR vs LDR;
- UDIM usage;
- alpha usage;
- normal/displacement/bump maps;
- missing textures;
- duplicate exact texture assets;
- material count;
- node count/complexity indicators;
- procedural/OSL/custom nodes where relevant.

### Geometry facts
- object count;
- triangle/poly counts;
- subdivision levels for viewport/render;
- geometry nodes/modifiers;
- displacement;
- hair/particles/curves;
- instances vs duplicated geometry;
- volumes;
- deforming vs static meshes.

### Lighting/shadow facts
- light count/type;
- large numbers of shadow-casting lights;
- emissive geometry;
- caustics/light-path configuration;
- bounce limits;
- EEVEE shadow/light settings where relevant;
- HDRI/world complexity.

### Worker/resource facts
- GPU backend supported;
- VRAM available;
- system RAM available;
- Blender/driver compatibility;
- observed OOM/compile/setup time;
- actual real-task runtime evidence once available.

The analyzer should output a structured **Optimization Plan**, not immediately mutate everything.

---

# 4. Three optimization risk tiers

## TIER A — SAFE/OPERATIONAL optimizations

Goal: improve execution without intentionally changing artistic output.

Candidates to evaluate:
- select the correct supported GPU backend/device;
- avoid reopening/downloading/preparing the same project unnecessarily within one authoritative Task lifecycle;
- use Blender-supported persistent render data for multi-frame workloads **when memory headroom and Blender version make it safe**;
- reuse prepared project state where Worker architecture safely permits it;
- remove only provably unused temporary/intermediate CWS artifacts, never customer assets referenced by the project;
- exact-byte duplicate asset detection for diagnostics;
- deterministic missing-asset/path repair only when the canonical materialization contract provides the exact intended asset;
- bounded caches and cleanup after Job completion;
- preserve original render engine/settings unless an approved optimization explicitly changes them.

Even Tier A must be version-tested. `use_persistent_data=True`, for example, can trade more memory for faster repeated rendering; on VRAM/RAM-constrained Workers it may be the wrong choice.

---

## TIER B — CONDITIONAL / QUALITY-SENSITIVE optimizations

These may improve speed but can change pixels.

Examples:
- adaptive sampling/noise threshold changes;
- denoising changes;
- max bounce reduction;
- disabling caustics;
- light sampling threshold changes;
- Blender Simplify;
- render subdivision limits;
- child-particle limits;
- texture-size limits/downscaling;
- shadow-map/resolution changes;
- material baking/flattening;
- reducing procedural shader complexity;
- disabling costly modifiers at render time;
- converting duplicated geometry to instances where semantic equivalence is proven.

Current rule:

> **Do not auto-apply Tier B to arbitrary customer Jobs until CWS has an approved visual-quality verification contract.**

The fact that an optimization is common in tutorials does not make it safe for a paid customer render.

---

## TIER C — DESTRUCTIVE / ART-DIRECTION-CHANGING optimizations

Examples:
- mesh decimation/remeshing;
- deleting lights;
- replacing HDRI/world lighting;
- changing shadow behavior materially;
- changing render engine Cycles <-> EEVEE;
- removing hair/particles/volumes;
- baking lighting and replacing the original dynamic setup;
- reducing animation fidelity;
- flattening non-equivalent materials;
- deleting objects/modifiers judged “unimportant” by AI.

Default:

**FORBIDDEN in normal automatic CWS render flow.**

Requires a separate Founder-approved product/quality decision.

---

# 5. Texture optimization rules

Textures affect:
- material appearance;
- upload/materialization size;
- RAM/VRAM pressure;
- shader setup time;
- potentially render performance.

But CWS must not use one global texture limit.

A 16K displacement map seen close to camera is not equivalent to a 16K background roughness map.

Before considering texture reduction, classify:
- semantic role: base color / normal / roughness / metallic / displacement / alpha / emission / HDR environment;
- camera-space projected size;
- bit depth/dynamic range;
- UDIM/sequence dependency;
- color-space setting;
- whether the texture is reused across many materials.

Safe first action:

**measure and report texture pressure.**

Risky later action:

**downscale/convert only under an explicit quality policy.**

Do not overwrite originals. Any optimized texture belongs in a derived CWS working directory and must preserve mapping/path semantics.

---

# 6. Light and shadow optimization rules

Lights/shadows are artistic data.

Therefore the first optimization level is **diagnosis**, for example:
- unusually high count of shadow-casting lights;
- very high bounce/caustic cost in Cycles;
- expensive emissive geometry;
- EEVEE-specific shadow/light resource pressure;
- transparent materials interacting with shadows;
- volumes greatly increasing render cost.

CWS may use these facts to:
- improve Worker eligibility;
- predict memory/performance risk;
- select more capacity;
- emit an optimization recommendation;
- later apply an approved bounded optimization.

CWS must not automatically decide that a light or shadow is visually unnecessary.

---

# 7. Geometry optimization rules

Use geometry statistics to detect risk:
- extreme subdivision;
- high-poly hidden/off-camera structures;
- duplicated full geometry vs instances;
- heavy hair/particle systems;
- geometry-node expansion;
- displacement;
- volumes.

However:

**Visibility in one frame is not proof of irrelevance to an animation.**

An object can affect:
- later frames;
- reflections;
- shadows;
- GI;
- holdouts/mattes;
- compositing;
- physics/dependencies.

Therefore AI must not delete or decimate based only on camera visibility heuristics.

---

# 8. Cycles-specific optimization lessons

From Blender's own performance presets and Cycles-oriented projects:

1. **Persistent data can speed repeated renders but costs memory.**
2. **Memory-constrained and speed-oriented presets are different profiles.**
3. **Bounce/caustic/sample tuning can save substantial time but can change appearance.**
4. **GPU backend/VRAM compatibility is part of scheduling eligibility.**
5. **One preset cannot be hard-coded for every customer scene.**
6. **Exact Blender-version grounding is mandatory because performance knobs evolve.**

CWS should eventually classify a Job into operational profiles such as:

`MEMORY_CONSTRAINED / NORMAL / REUSE_FRIENDLY`

These are **internal execution profiles**, not customer pricing/speed tiers.

---

# 9. EEVEE-specific optimization lessons

Also read:

`EEVEE_RENDERING.md`

Rules that remain binding:
- preserve EEVEE/EEVEE Next engine identity;
- do not convert to Cycles for “compatibility”;
- ground exact Blender version/GPU backend;
- lighting/shadow settings are project semantics;
- measure actual runtime on useful real Tasks;
- animation finalization remains part of the 45-minute target.

---

# 10. Recommended future CWS Optimization Pipeline

When optimization becomes an active implementation milestone, prefer:

```text
IMMUTABLE CUSTOMER ORIGINAL
        ↓
canonical materialized input
        ↓
metadata + scene complexity inventory
        ↓
Optimization Plan
        ↓
classify operations: Tier A / B / C
        ↓
apply approved Tier A only to DERIVED WORKING COPY
        ↓
real render Tasks start
        ↓
collect actual runtime/memory/error evidence
        ↓
Adaptive Scheduler uses evidence
        ↓
future Tier-B quality contract if Founder approves
```

Do not create a separate long benchmark phase solely for optimization.

The first useful real render Tasks should still produce runtime evidence for scheduling.

---

# 11. Optimization Plan schema concept

A future deterministic analyzer may produce something conceptually like:

```json
{
  "engine": "CYCLES",
  "blender_version": "x.y.z",
  "scene": {
    "frames": 300,
    "objects": 420,
    "triangles": 18000000,
    "lights": 64,
    "volumes": 1
  },
  "textures": {
    "count": 238,
    "source_bytes": 12884901888,
    "max_dimension": 16384,
    "udim_sets": 6
  },
  "risk_flags": [
    "HIGH_TEXTURE_PRESSURE",
    "HIGH_SUBDIVISION",
    "MANY_SHADOW_LIGHTS"
  ],
  "safe_actions": [
    "USE_SUPPORTED_GPU",
    "CONSIDER_PERSISTENT_DATA_IF_MEMORY_HEADROOM"
  ],
  "quality_sensitive_actions": [
    "TEXTURE_LIMIT",
    "REDUCE_BOUNCES",
    "SIMPLIFY_SUBDIVISION"
  ]
}
```

This is a design concept, not a current API contract.

---

# 12. Deterministic safety invariants

Any future Blender optimizer must preserve:

1. Customer original is immutable.
2. Derived optimization workspace has a clear lifecycle and cleanup.
3. Render engine is not changed without explicit policy.
4. Frame range/FPS/resolution/output semantics remain authoritative.
5. Color management is not silently changed.
6. Missing assets are not replaced with invented assets.
7. Untrusted Python autoexec remains disabled.
8. Tier-B/Tier-C changes cannot silently enter production.
9. Optimization failure falls back to safe canonical rendering where possible, rather than corrupting the Job.
10. Optimizer errors are evidence, not permission to mutate more aggressively.
11. No reboot/shutdown/restart of Windows is permitted for optimization testing.
12. Actual runtime/memory evidence must be recorded separately from guessed improvement percentages.

---

# 13. What CWS should implement first when this becomes active

The first slice should **not** be an “AI auto optimizer.”

It should be a deterministic **Blender Optimization Analyzer** that only reads the derived project and reports:
- engine/version;
- texture pressure;
- geometry complexity;
- modifiers/subdivision;
- lights/shadows;
- particles/hair/volumes;
- major Cycles/EEVEE performance settings;
- memory-risk indicators;
- candidate Tier-A/Tier-B optimizations.

Then CWS can correlate those facts with real Worker runtime/OOM evidence.

Only after enough evidence exists should automatic optimization actions be enabled one by one.

---

# 14. Final distilled rule

> **CWS should optimize execution aggressively, but optimize customer art conservatively.**

The fastest safe wins are usually:

`correct GPU/Worker eligibility + avoid repeated setup + reuse supported render data + good task parallelism + actual runtime feedback`

before destructive tricks such as:

`downscale textures + reduce shadows + remove lights + decimate geometry`.

That ordering protects customer output while still pursuing the CWS speed advantage.
