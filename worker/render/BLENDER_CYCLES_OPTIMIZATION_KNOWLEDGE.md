# Blender Cycles Optimization Knowledge — Track A

> Status: CURRENT_SUPPORTING
> Domain: WORKER / RENDER
> Scope: Founder-controlled Track A (`cws_worker.bat` + `cws_worker_full.py`)
> Purpose: one curated source for Blender/Cycles render optimization knowledge that is safe to use when improving real Track A renders.
> Rule: this file is supporting knowledge, not permission to rewrite customer scene intent.

## 1. Core principle

CWS should optimize **compute before appearance**.

Default reasoning:

`inspect scene -> preserve original -> baseline render -> identify bottleneck -> test one relevant optimization -> compare time + output -> keep/reject -> final render`

Do not apply a universal “magic preset” to every customer project.

Claims such as “works for 99.9% of scenes” are not accepted as authoritative. Cycles behavior depends on scene lighting, materials, transparency, volumes, caustics, geometry, device, memory, Blender version and quality requirements.

## 2. Source hierarchy used for this knowledge

### Tier A — authoritative upstream

1. Blender 4.5 LTS Manual — Cycles Sampling / Adaptive Sampling.
2. Blender 4.5 LTS Manual — Cycles Light Paths / Bounces / Clamping / Caustics / Fast GI.
3. Blender 4.5 LTS Manual — Cycles GPU Rendering.
4. Blender 4.5 LTS Manual — Cycles Performance / Persistent Data / memory trade-offs.
5. Blender 4.5 LTS Manual — Command-line Cycles device selection and render statistics.
6. Blender official source mirror (`blender/blender`, ~19k GitHub stars when researched 2026-08-14).
7. Cycles official source mirror (`blender/cycles`, ~600 GitHub stars when researched 2026-08-14).

### Tier B — mature external projects worth learning from

1. `DLR-RM/BlenderProc` — ~3.6k GitHub stars when researched 2026-08-14.
   - Useful lesson: modular/headless Blender pipeline, explicit ordered stages, repeatable output handling.
   - CWS use: learn pipeline structure and deterministic render orchestration.
   - Do **not** replace Track A with BlenderProc or add its dependency stack merely because it is mature.

2. `LogicReinc/LogicReinc.BlendFarm` — ~530 GitHub stars when researched 2026-08-14.
   - Useful lesson: network rendering has non-trivial startup/chunk overhead.
   - The project documents that initializing Blender for every small chunk can be expensive and larger/split chunks may improve throughput.
   - CWS use: measure chunk overhead before hard-coding 1/2/5/10 frames per task; allow a fast Worker to take another chunk when finished.
   - Do **not** import its custom TCP/discovery architecture into Track A.

3. Intel/RenderKit Open Image Denoise (OIDN).
   - Useful lesson: denoising can materially reduce the samples required for ray-traced images.
   - CWS use: treat denoising as a benchmark candidate, not a universal animation preset.

## 3. Official Cycles facts that matter to CWS

### 3.1 Adaptive Sampling / Noise Threshold

Cycles adaptive sampling can stop sampling pixels that have already converged, allowing more work to be spent on noisy regions.

Official Blender guidance commonly places useful Noise Threshold values roughly in the `0.1` to `0.001` range; lower means cleaner but generally slower.

CWS rule:

- `0.03` may be benchmarked as a starting candidate;
- it is **not** a universal final setting;
- use a high Max Samples ceiling only as a ceiling while adaptive sampling determines actual work;
- record actual render time and output quality before promotion.

### 3.2 Animated Seed

Cycles can vary the sampling seed per animation frame. Blender recommends this for animation because varying noise patterns are generally less noticeable than an identical fixed pattern.

CWS rule:

- Animated Seed is a reasonable animation candidate;
- do not describe it as real film-grain simulation;
- changing seed does not solve temporal denoising consistency by itself.

### 3.3 Light Bounces

Reducing bounce counts can reduce render cost, but different materials need different path depth:

- diffuse often tolerates fewer bounces;
- glossy may require more;
- transmission/glass usually requires more;
- transparent bounces are controlled separately and each transparency step still costs shader/ray work;
- volumes can be especially expensive.

CWS rule:

- never force `Total Bounces = 2` on every project;
- bounce reduction is an A/B-test optimization because it can change lighting.

### 3.4 Clamping / Fireflies

Clamp can reduce fireflies but sacrifices physically correct bright contributions. Very low clamp values can remove legitimate highlights and indirect illumination.

CWS rule:

- never auto-force extreme Indirect Clamp values such as `0.1` across customer scenes;
- use only after a confirmed firefly problem;
- compare against baseline output;
- indirect-only clamp is preferable to destroying direct highlights when clamp is actually needed.

### 3.5 Caustics / Fast GI

Caustics are expensive/noisy in path tracing. Fast GI is an approximation and intentionally trades physical accuracy for speed.

CWS rule:

- disabling reflective/refractive caustics or enabling Fast GI changes appearance/lighting semantics;
- these are diagnostic/A-B candidates, never blind defaults.

### 3.6 Volume / VDB

Volume rendering can be a major cost center. Step configuration and maximum steps trade detail/accuracy against time.

CWS rule:

- first detect that volume is actually present and problematic;
- avoid increasing volume steps by default;
- any change requires representative render comparison.

### 3.7 GPU rendering

Cycles supports GPU rendering through backends including CUDA, OptiX, HIP, oneAPI and Metal, depending on hardware/platform.

For compatible NVIDIA RTX hardware, OptiX uses hardware ray-tracing acceleration and is a strong benchmark candidate.

GPU memory remains a real constraint; a project that runs on CPU can fail or slow severely on GPU because of memory pressure.

CWS rule:

- detect available backend instead of assuming one;
- benchmark the available best-supported backend on the actual Worker;
- do not claim GPU is always faster for every scene/device;
- capture OOM/fallback behavior clearly.

### 3.8 Persistent Data

Cycles Persistent Data keeps render data in memory for faster rerenders and animation renders, at the cost of additional memory usage.

CWS rule:

- this is a high-value Track A benchmark candidate for sequential frame chunks on the same project;
- enable only when memory headroom is adequate;
- measure whether it reduces per-chunk Blender/scene preparation overhead.

### 3.9 Command-line diagnostics

Blender supports explicit Cycles device selection and render statistics from the command line.

Useful concepts:

- background rendering;
- explicit frame/range execution;
- explicit Cycles backend;
- Cycles render statistics for memory/time diagnostics.

CWS rule:

- prefer explicit command construction and evidence collection over relying on GUI state;
- log the effective Blender version, engine, device and intended frame range for each Track A render attempt.

## 4. CWS optimization classification

### Class S — safe to inspect/measure automatically

These should not alter customer visual intent by themselves:

- Blender version;
- render engine;
- frame start/end/current frame;
- output format/path;
- resolution/FPS;
- current sample/noise/bounce/denoise settings;
- scene/device availability;
- VRAM/RAM pressure where measurable;
- linked/missing assets;
- presence of volume/transparency/caustic-relevant features;
- render statistics and per-frame timing;
- Blender startup/preparation time;
- chunk overhead;
- fresh-output existence/integrity.

### Class A — generally safe operational performance candidates, benchmark first

- choose a supported GPU backend rather than accidental CPU rendering;
- Persistent Data for repeated frames/chunks when memory permits;
- avoid unnecessary Blender restart between small sequential chunks when the existing Track A lifecycle can safely reuse one process/project state;
- explicit output/frame-range handling;
- deterministic fresh-output cleanup before a new attempt;
- collect render stats to drive later decisions.

### Class B — visual-quality trade-off; A/B test on a working copy

- Noise Threshold / adaptive sampling changes;
- Max/Min Samples changes;
- denoising changes;
- bounce reduction;
- transparent bounce adjustments;
- volume step/quality adjustments;
- light threshold / sampling changes.

Promotion rule:

`faster + acceptable output comparison + no semantic break -> candidate`

Otherwise reject and keep customer settings.

### Class C — do not auto-change without concrete artifact diagnosis

- strong indirect/direct clamping;
- Fast GI approximation;
- caustics behavior;
- material/shader rewrites;
- lighting changes;
- geometry simplification that can change silhouette/detail;
- texture/alpha removal;
- compositor changes;
- customer camera/color-management changes.

These can materially change the artistic result.

## 5. Animation / frame-chunk lessons for Track A

Founder direction for future multi-Worker rendering is dynamic small chunks:

`queue -> Worker claims frame chunk -> render -> verify -> complete -> claim next available chunk`

A faster Worker naturally processes more chunks; a slower Worker processes fewer.

Workers should not negotiate frame ownership peer-to-peer. One authoritative assignment source should prevent overlaps and skipped ranges.

### Chunk-size lesson from BlendFarm

External render-farm experience shows that making chunks too small can waste time because Blender/project initialization and compositing may repeat for every chunk.

Therefore CWS must **measure**, not guess, final chunk size.

Initial experiment ladder:

`1 frame -> 2 frames -> 5 frames -> 10 frames`

Measure for each:

- Blender startup/project load time;
- render seconds per frame;
- total chunk wall-clock time;
- cleanup/upload overhead;
- memory behavior;
- failure/retry cost.

For today's one-PC Track A test, `2 frames/chunk` remains a useful starting point, not a permanent architecture decision.

## 6. Recommended Track A optimizer workflow

Do not build a large “AI optimizer” yet.

Minimum useful implementation shape:

1. Preserve original customer `.blend`.
2. Create/operate on working copy.
3. Inspect scene and effective render settings.
4. Render a small baseline frame/chunk using original settings.
5. Record render statistics and output fingerprint/quality evidence.
6. Detect the dominant current cost/problem.
7. Select at most one relevant candidate change.
8. Render the same representative frame/chunk.
9. Compare wall-clock time, output integrity and visible/quantitative difference.
10. Keep the candidate only when evidence supports it.
11. Restore/reject otherwise.
12. Never silently mutate the immutable original.

## 7. First benchmark order for the Founder test file

For the current Founder-controlled real Blender test project, prefer this order:

### Benchmark 0 — baseline

- original customer settings;
- current intended GPU/backend;
- one small representative frame/chunk;
- measure total wall-clock, render-only time, memory and output.

### Benchmark 1 — operational overhead

- verify best supported GPU backend;
- measure Blender startup/project-load overhead;
- test Persistent Data / same-process sequential frames if compatible with current Track A code.

This is preferred before altering scene quality.

### Benchmark 2 — adaptive sampling candidate

Only if baseline sampling is clearly expensive:

- test a Noise Threshold candidate such as `0.03` on the working copy;
- keep existing original as control;
- compare render time and output.

### Benchmark 3 — scene-specific diagnosis

Only when evidence identifies a problem:

- fireflies -> investigate MIS/light paths/clamp carefully;
- black alpha layers -> inspect transparent bounces/material setup;
- VDB/volume cost/artifacts -> inspect volume settings;
- interior indirect-light problem -> inspect bounces/lighting rather than applying a universal low-bounce preset.

## 8. Promotion gates for any automatic optimization

A setting may become an automatic Track A optimization only after repeated real evidence shows:

1. reproducible speed benefit;
2. no unacceptable visual/semantic change across the tested class of scenes;
3. deterministic rollback/fallback to original settings;
4. no damage to customer original;
5. no new frequent render failure mode;
6. the added code/complexity is justified by measured benefit.

Otherwise keep it as a manual/diagnostic candidate.

## 9. Things explicitly rejected as universal CWS rules

Do **not** encode these as universal truths:

- “Noise Threshold 0.03 is correct for 99.9% of scenes.”
- “Max Samples 2048 is always correct.”
- “Total Light Bounces 2 is always correct.”
- “Indirect Clamp 0.1 should always be used.”
- “Denoising should always be disabled for animation.”
- “Fast GI should always be disabled/enabled.”
- “High-poly geometry does not affect performance.”
- “Animated Seed creates cinematic film grain.”
- “A fixed chunk size is optimal for all projects.”

## 10. External projects: what CWS should and should not reuse

| Source | Learn / reuse concept | Do not import blindly |
|---|---|---|
| Blender Manual + Blender/Cycles source | renderer truth, settings semantics, CLI/device behavior | no issue |
| BlenderProc | modular ordered headless pipeline, repeatable stages | its full framework/dependency model |
| BlendFarm | chunk-overhead measurement, queueing, nodes finishing then taking more work | custom TCP/discovery/network architecture |
| OIDN | denoise can trade sample count for reconstruction | universal per-frame denoise policy for animation |

## 11. Evidence language

When reporting optimization results, distinguish:

- `SOURCE-DERIVED LESSON` — upstream/documented behavior;
- `CWS HYPOTHESIS` — plausible optimization not yet tested on CWS;
- `TRACK_A BENCHMARK VERIFIED` — measured on Founder-controlled Track A;
- `TRACK_A REAL PROJECT VERIFIED` — measured on a real accepted project;
- `NOT VERIFIED` — no runtime evidence yet.

Do not promote external benchmark claims into CWS facts.

## 12. Sources researched 2026-08-14

Authoritative Blender sources:

- Blender 4.5 LTS Manual — Cycles Sampling / Adaptive Sampling
- Blender 4.5 LTS Manual — Cycles Light Paths
- Blender 4.5 LTS Manual — Cycles GPU Rendering
- Blender 4.5 LTS Manual — Cycles Performance
- Blender 4.5 LTS Manual — Cycles Reducing Noise
- Blender 4.5 LTS Manual — Command Line Arguments / Cycles device options
- Blender official GitHub mirror: `blender/blender`
- Cycles official GitHub mirror: `blender/cycles`

Selected external repositories/projects:

- `DLR-RM/BlenderProc` — selected for strong adoption and mature headless pipeline patterns
- `LogicReinc/LogicReinc.BlendFarm` — selected for direct relevance to Blender distributed rendering/chunk overhead
- Intel Open Image Denoise / `RenderKit/oidn` — selected because Blender uses OIDN-class denoising and it is a mature ray-tracing denoise project

Selection rule:

`official upstream > mature/high-adoption relevant project > small niche project`

GitHub stars are only a supporting adoption signal, never proof that an implementation is correct or appropriate for CWS.
