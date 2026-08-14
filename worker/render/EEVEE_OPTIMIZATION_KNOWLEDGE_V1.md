# EEVEE Optimization Knowledge V1 — Track A

> Status: CURRENT_SUPPORTING
> Date: 2026-08-14
> Domain: WORKER / RENDER / EEVEE
> Scope: Founder-controlled Track A (`cws_worker.bat` + `cws_worker_full.py`)
> Purpose: define an EEVEE/EEVEE Next-specific optimization knowledge base before active Worker convergence.
> Core rule: **ENGINE DETECTION MUST HAPPEN BEFORE OPTIMIZATION.**

---

## 1. Core principle

CWS must not optimize a Blender file until the active render engine is identified from Blender itself.

Required entry flow:

```text
.blend
  -> ENGINE DETECTOR
      -> CYCLES
          -> Cycles preflight / Cycles policy
      -> BLENDER_EEVEE / BLENDER_EEVEE_NEXT
          -> EEVEE preflight / EEVEE policy
      -> UNKNOWN / unsupported
          -> report only, preserve original settings
```

Do **not** infer engine from:

- file name;
- customer segment;
- architecture/animation labels;
- historical job type;
- extension alone.

Read the engine from the scene, for example conceptually:

```python
engine = bpy.context.scene.render.engine
```

If engine detection is uncertain, CWS must fail safe:

`UNKNOWN -> NO AUTO OPTIMIZATION -> render with customer settings + report`.

---

## 2. Why EEVEE requires a separate path from Cycles

Cycles is a path-tracing renderer. EEVEE is a GPU rasterization/realtime renderer with different bottlenecks and different failure modes.

A useful CWS mental model is:

```text
CYCLES COST
= ray/path complexity
+ samples / convergence
+ light paths / bounces
+ shader complexity
+ geometry / memory

EEVEE COST
= GPU raster workload
+ shadow system
+ transparency / overdraw
+ volume
+ raytraced/refraction features
+ geometry preparation on CPU
+ object/material complexity
+ VRAM pressure
```

Therefore:

- Cycles-specific knobs must not be blindly applied to EEVEE;
- the existence of a Blender API property does not prove that it materially improves EEVEE runtime;
- EEVEE optimization requires its own benchmark evidence.

---

## 3. Source hierarchy

### Tier A — authoritative

Use these as source of truth before community advice:

1. Blender 4.5 LTS Manual — EEVEE Limitations.
2. Blender 4.5 LTS Manual — EEVEE Material Settings.
3. Blender 4.5 LTS Manual — EEVEE Light Settings.
4. Blender official source repository `blender/blender`, especially `source/blender/draw/engines/eevee/`.
5. Blender Python API for version-specific property existence.

### Tier B — mature GitHub projects worth learning from

#### `DLR-RM/BlenderProc` (~3.6k stars when researched 2026-08-14)

Useful lessons:

- ordered headless Blender stages;
- explicit initialization;
- deterministic input/output boundaries;
- scene setup and rendering should be separable stages.

CWS use:

`detect -> inspect -> plan -> benchmark -> render -> validate`

Do not import BlenderProc wholesale into Track A.

#### `ucupumar/ucupaint` (~2.2k stars when researched 2026-08-14)

Useful lessons:

- Blender materials/textures are semantic assets, not disposable performance knobs;
- EEVEE and Cycles share material workflows but may evaluate them differently;
- material/texture manipulation needs Blender-version awareness.

CWS use:

Do not auto-rewrite material trees or downscale textures as a universal EEVEE optimization.

### Selection rule

```text
official Blender behavior
> mature/high-adoption relevant repository
> community advice
> social-media preset
```

GitHub stars are an adoption signal only, not proof of correctness.

---

## 4. EEVEE engine/version detection

The preflight should capture at minimum:

```text
blender_version
render_engine
engine_generation
```

Suggested normalized values:

```text
CYCLES
EEVEE_LEGACY
EEVEE_NEXT
UNKNOWN
```

Do not hard-code assumptions about one Blender version forever.

Version-gate property access with `hasattr()` / capability detection because EEVEE APIs changed substantially across Blender generations.

---

## 5. EEVEE bottleneck fingerprint

Every EEVEE preflight should try to produce a compact cost fingerprint.

Example:

```text
ENGINE = EEVEE_NEXT

SHADOW_PRESSURE = HIGH
TRANSPARENCY_PRESSURE = MEDIUM
VOLUME_PRESSURE = NONE
GEOMETRY_PREP_PRESSURE = HIGH
TEXTURE_VRAM_PRESSURE = HIGH
RAYTRACE_PRESSURE = LOW
ANIMATION_REBUILD_PRESSURE = MEDIUM

LIKELY BOTTLENECKS:
1. geometry preparation
2. shadows
3. texture VRAM
```

This is a diagnostic model, not an exact render-time predictor.

---

## 6. Shadow system

EEVEE shadow cost is a first-class optimization domain.

Current EEVEE uses a virtualized shadow-map system internally. Blender's source contains dedicated EEVEE shadow tile/page allocation and update logic, reinforcing that shadow pressure is not a minor setting.

### Inspect

- total lights;
- number of shadow-casting lights;
- light types;
- lights using jitter;
- shadow resolution limits where exposed;
- shadow pool pressure/warnings when available in logs;
- whether shadows must be updated every sample/frame;
- animated/moving lights and shadow casters.

### Important official behavior

Higher shadow detail can consume more memory.

Increasing shadow Resolution Limit values can reduce memory use and speed heavy scenes, but trades shadow quality and can increase light-leaking risk.

Jittered shadows can have high performance cost because caching may be reduced/invalidated and shadow work must be repeated for render samples.

### CWS policy

`shadow setting changes = BENCHMARK FIRST`

Do not silently:

- disable customer shadows;
- lower all shadow quality globally;
- disable jitter globally;
- change light size/shape to gain speed.

---

## 7. Transparency and alpha overdraw

Transparency is a major EEVEE-specific cost domain.

### Inspect

- count of materials using transparency;
- Blended vs Dithered render methods where available;
- transparent shadow usage;
- foliage/grass/hair-card style assets;
- object count using transparent materials;
- overlapping transparent layers;
- raytraced transmission/refraction.

### Important official behavior

Blended transparency uses per-object sorting. Blender documentation notes that sorting has a performance cost and thousands of transparent objects can greatly degrade performance.

`Transparency Overlap` can cause more transparent fragments to be rendered.

Transparent shadows improve correctness but disabling them may render faster at a visual cost.

### CWS policy

Detect and report transparency pressure automatically.

Do not auto-disable:

- transparent shadows;
- transparency overlap;
- alpha materials;
- foliage density;
- transmissive materials.

These are visual/semantic changes.

---

## 8. Backface Culling

Blender documentation explicitly notes that Backface Culling should be enabled whenever possible because it impacts performance.

However, CWS must not treat it as universally safe.

Potential visual risks:

- single-sided architecture surfaces;
- curtains;
- foliage;
- thin meshes;
- intentionally double-sided materials;
- interior walls modeled without thickness.

### CWS policy

`Backface Culling = BENCHMARK CANDIDATE`, not universal auto-enable.

Preflight may flag materials/objects where culling appears plausible, but active promotion requires a representative output comparison.

---

## 9. Geometry preparation and CPU pressure

EEVEE renders using GPU rasterization, but Blender still needs CPU work to prepare complex geometry before each frame.

This is important for CWS because a Worker can appear to have available GPU headroom while still rendering slowly due to scene preparation.

### Inspect

- object count;
- mesh count;
- evaluated polygon/triangle estimates where safe;
- Geometry Nodes modifiers;
- generated instances;
- subdivision/multires;
- displacement;
- modifiers that reevaluate per frame;
- particles/hair;
- simulation caches;
- linked collections;
- animation-driven geometry changes.

### Risk patterns

```text
many objects
+ Geometry Nodes
+ per-frame modifiers
+ subdivision
+ particles/hair
= HIGH geometry-preparation risk
```

### CWS policy

Measure before optimizing.

Do not automatically:

- apply modifiers destructively;
- decimate meshes;
- lower subdivision levels;
- reduce Geometry Nodes output;
- reduce particle/hair counts.

All can change customer output.

---

## 10. Displacement

EEVEE material displacement can have per-sample performance cost.

Blender documentation notes that true displacement evaluation has a performance impact multiplied by render sample count, while Geometry Nodes/modifier-based alternatives can have different preparation costs.

### Inspect

- displacement mode;
- displacement nodes;
- subdivision dependency;
- object count using displacement;
- render sample count.

### CWS policy

Displacement changes are benchmark-only.

Never auto-replace true displacement with bump mapping without explicit quality policy.

---

## 11. Volumes

Volumes are a high-risk cost domain for EEVEE.

### Inspect

- Volume objects;
- Principled Volume nodes;
- Volume Scatter / Absorption;
- World volume;
- VDB/external volume references;
- volume shadowing;
- animated volume data;
- volumetric quality/step settings where supported.

### CWS policy

`VOLUME_PRESENT -> high-priority diagnosis`

Do not auto-reduce:

- volume density;
- volume quality;
- step counts;
- VDB resolution;
- volume shadows.

These can visibly alter smoke, fog, clouds and atmosphere.

---

## 12. Raytracing, transmission and thickness

Modern EEVEE can use raytraced features and transmission approximations with important compatibility/performance trade-offs.

### Inspect

- raytracing enabled;
- materials using transmission;
- raytraced transmission/refraction;
- material render method;
- thickness mode;
- thickness-from-shadow usage;
- glass-heavy scenes.

### Important official behavior

Blended materials are not compatible with raytracing in the same way as dithered materials.

Thickness from shadow can have a performance impact that scales with render samples.

### CWS policy

Do not auto-change glass/transmission workflow.

These are semantic rendering choices.

---

## 13. VRAM and texture pressure

EEVEE GPU memory is managed by the graphics driver. Blender documentation explicitly warns that excessive GPU memory use can freeze/crash the driver/application and that there is no standard reliable method to predict whether all resources will fit successfully.

Therefore CWS must treat VRAM estimation as a risk indicator, not certainty.

### Inspect

- GPU model;
- total VRAM;
- current available VRAM where measurable;
- image count;
- 4K/8K/16K textures;
- packed images;
- UDIM usage;
- material count;
- geometry footprint;
- volume/VDB footprint;
- duplicated large images;
- render resolution.

### Historical CWS lesson

A previous Track A approach resized Blender images and wrote them back into the customer `.blend`. Real runtime evidence showed this could corrupt/poison subsequent render behavior and was removed.

Therefore:

**Never overwrite the immutable customer original for texture optimization.**

### CWS policy

Texture conversion/downscaling = benchmark on derived working copy only.

Do not infer:

`8K texture -> automatically reduce to 2K`.

An 8K texture may be intentional and visible in final delivery.

---

## 14. EEVEE samples

EEVEE sample count is not equivalent to Cycles path-tracing samples.

Reducing samples can affect:

- anti-aliasing;
- jittered shadows;
- temporal/sample-based effects;
- material/raytracing quality;
- volume appearance.

### CWS policy

Do not preserve the historical rule:

`sample >= 200 -> silently reduce 15%`.

New rule:

`EEVEE samples = BENCHMARK FIRST`.

Any automatic promotion needs real CWS A/B evidence across a defined workload class.

---

## 15. Persistent Data

Persistent Data is not automatically useful merely because the property exists.

Current Track A historically launches a fresh Blender process for each frame. When Blender exits after every frame, cross-frame reuse benefits of Persistent Data may not be realized.

### CWS policy

Before enabling Persistent Data as a performance feature, verify:

```text
same Blender process survives across multiple frames/chunks
AND
scene data is reusable
AND
memory headroom is acceptable
```

Otherwise classify it as `NO PROVEN BENEFIT IN CURRENT LIFECYCLE`.

---

## 16. Headless Windows limitation

Blender documentation states that EEVEE headless rendering is not supported on a truly headless Windows system.

CWS must distinguish:

- Blender background rendering on a Windows machine with an active GPU/display environment;
- a truly headless Windows configuration without the graphics context EEVEE needs.

### CWS policy

Before blaming the `.blend`, record:

```text
Windows session state
GPU/driver availability
Blender version
EEVEE engine generation
background command
return code
GPU initialization diagnostics
```

Do not classify all headless failures as customer-file defects.

---

## 17. Multi-GPU assumption

EEVEE does not provide Cycles-style multi-GPU rendering support for one frame.

For CWS scale, parallelism should remain job/frame distribution across Workers, not an assumption that one EEVEE frame can automatically consume several GPUs through Blender.

---

## 18. Workload profiles

Engine detection comes first. Workload classification comes second.

### EEVEE + ARCHVIZ_INTERIOR

Prioritize inspection of:

- many lights / shadow pressure;
- glass/transmission;
- indirect-light approximation/probes;
- texture VRAM;
- subdivision/displacement;
- dense furniture/object counts;
- Geometry Nodes;
- volume/fog.

### EEVEE + ARCHVIZ_EXTERIOR

Prioritize:

- foliage transparency;
- many instances;
- high-resolution textures;
- displacement;
- environment/HDRI;
- large geometry;
- shadow pressure.

### EEVEE + ANIMATION

Add:

- per-frame dependency evaluation;
- animated modifiers;
- Geometry Nodes rebuild cost;
- simulation caches;
- animated shadows;
- per-frame geometry preparation;
- startup/load overhead versus render-only time.

### EEVEE + GENERAL

Use scene-characteristic detection rather than guessing a special profile.

---

## 19. Optimization tiers

### Tier S — safe automatic detection/measurement

Allowed automatically:

- engine/version detection;
- render resolution;
- frame range;
- sample settings readout;
- object/material/light counts;
- transparency presence;
- volume presence;
- raytracing/transmission presence;
- Geometry Nodes/modifier detection;
- texture dimensions/count;
- missing assets;
- VRAM/RAM telemetry where available;
- startup/load/render timing;
- Blender return code/log diagnostics;
- working-copy integrity checks.

These are observation operations, not visual mutations.

### Tier A — operational optimization candidates

Potentially safe, but still verify lifecycle/preconditions:

- avoid unnecessary repeated downloads;
- preserve local Blender cache;
- avoid repeated analysis for the same job;
- reuse already-rendered/validated B2 frames;
- reduce avoidable Worker startup overhead;
- reuse Blender process/project state only when tested safe;
- correct GPU/driver/session initialization.

### Tier B — benchmark before any promotion

- Backface Culling;
- shadow resolution/detail changes;
- shadow jitter behavior;
- transparent shadow behavior;
- transparency overlap;
- render samples;
- raytracing/transmission settings;
- volume quality;
- Simplify controls;
- Persistent Data;
- texture conversion/downscale on a working copy.

### Tier C — do not auto-change customer intent

- materials;
- lighting design;
- camera;
- output resolution;
- geometry topology;
- particle/hair density;
- subdivision/displacement level;
- glass design;
- volume density;
- foliage removal;
- destructive texture resize;
- compositor/color-management changes.

---

## 20. Recommended EEVEE preflight report

Minimum structured output:

```json
{
  "engine": "EEVEE_NEXT",
  "blender_version": "x.y.z",
  "workload_profile": "ARCHVIZ_INTERIOR",
  "profile_confidence": 0.0,
  "pressures": {
    "shadow": "LOW|MEDIUM|HIGH|UNKNOWN",
    "transparency": "LOW|MEDIUM|HIGH|UNKNOWN",
    "volume": "LOW|MEDIUM|HIGH|UNKNOWN",
    "geometry_prep": "LOW|MEDIUM|HIGH|UNKNOWN",
    "texture_vram": "LOW|MEDIUM|HIGH|UNKNOWN",
    "raytrace": "LOW|MEDIUM|HIGH|UNKNOWN",
    "animation_rebuild": "LOW|MEDIUM|HIGH|UNKNOWN"
  },
  "likely_bottlenecks": [],
  "safe_observations": [],
  "benchmark_candidates": [],
  "do_not_auto_change": [],
  "unknowns": []
}
```

Do not fabricate confidence or risk values when evidence is missing.

Use `UNKNOWN`.

---

## 21. Required active-Worker entry gate

Before `cws_worker_full.py` applies any optimization code:

```text
1. open/read scene safely
2. detect Blender version
3. detect render engine
4. route to engine-specific policy
5. inspect scene characteristics
6. create optimization plan
7. apply only operations permitted by that engine policy
8. render
9. validate output
10. record evidence
```

Hard rule:

```text
NO ENGINE DETECTION
= NO AUTO OPTIMIZATION
```

---

## 22. Historical Track A policy that must not be carried forward blindly

Historical Worker code contains automatic mutations that were previously labeled `gentle` / `level2_safe`, including examples such as:

- sample reduction;
- caustics changes;
- indirect clamp changes;
- Simplify settings;
- particle reductions;
- texture limits;
- automatic lighting mutation for no-light scenes.

These must be individually reclassified under current policy.

A historical comment or previous Founder experiment is not sufficient evidence to call a visual mutation universally safe.

Current rule:

`OPTIMIZE COMPUTE BEFORE ALTERING APPEARANCE`.

---

## 23. Benchmark methodology before promotion

For any proposed EEVEE optimization:

```text
immutable original
-> derived working copy A = baseline
-> derived working copy B = one candidate change
-> same representative frame
-> same Worker/GPU
-> measure
-> compare output
-> keep or reject
```

Capture at minimum:

- Blender startup time;
- scene load/preparation time;
- render time;
- total wall-clock;
- peak VRAM where measurable;
- output validity;
- visible/quantitative output difference;
- crashes/warnings.

Change **one variable at a time**.

---

## 24. Promotion gates

An EEVEE optimization may become automatic only after CWS verifies:

1. repeatable runtime benefit;
2. acceptable output across the defined workload class;
3. no mutation of immutable customer original;
4. deterministic rollback/fallback;
5. no new frequent crash/failure mode;
6. Blender-version compatibility or explicit version gating;
7. benefit justifies added code complexity.

Otherwise keep it as:

`BENCHMARK_CANDIDATE`.

---

## 25. Explicitly rejected universal rules

Do not encode these as universal truths:

- “reduce EEVEE samples by 15% automatically”;
- “all 8K textures should become 2K”;
- “enable Backface Culling everywhere”;
- “disable transparent shadows everywhere”;
- “disable jitter everywhere”;
- “reduce every shadow map”;
- “Persistent Data always makes animation faster”;
- “EEVEE is GPU-only so CPU does not matter”;
- “available VRAM guarantees the scene will render”;
- “Cycles optimizations can be reused unchanged for EEVEE”;
- “one preset works for all architectural scenes”.

---

## 26. CWS next integration target

After this knowledge file is accepted, the smallest safe active-Worker convergence is:

```text
ENGINE DETECTOR
  -> CYCLES policy
  -> EEVEE policy
  -> UNKNOWN safe fallback
```

Then converge `cws_worker_full.py` so that:

- old cross-engine optimization assumptions are removed/disabled;
- analysis remains available;
- EEVEE and Cycles decisions are separated;
- customer original remains immutable;
- quality-sensitive mutations require benchmark evidence;
- real Windows Blender runtime test is required before releasing a new Worker version.

Do not claim this knowledge document alone means active Worker optimization is complete.

---

## 27. Sources researched 2026-08-14

Authoritative:

- Blender 4.5 LTS Manual — EEVEE Limitations
- Blender 4.5 LTS Manual — EEVEE Material Settings
- Blender 4.5 LTS Manual — EEVEE Light Settings
- Blender official GitHub source — `blender/blender`, EEVEE engine/shadow implementation under `source/blender/draw/engines/eevee/`

Selected mature GitHub projects:

- `DLR-RM/BlenderProc` — mature headless Blender pipeline patterns
- `ucupumar/ucupaint` — mature EEVEE/Cycles material and texture workflow reference

Canonical CWS cross-references:

- `worker/render/BLENDER_CYCLES_OPTIMIZATION_KNOWLEDGE.md`
- `worker/blender_optimizer.py`
- `worker/archviz_profiles.json`
- `reports/worker/CWS_RENDER_OPTIMIZATION_POLICY_CONVERGENCE_2026-08-14.md`

---

## 28. Final rule for future AI sessions

When an AI session is asked to optimize a Blender render:

```text
FIRST ask Blender what engine the scene actually uses.
THEN apply the correct engine-specific knowledge.
NEVER optimize from assumptions.
```
