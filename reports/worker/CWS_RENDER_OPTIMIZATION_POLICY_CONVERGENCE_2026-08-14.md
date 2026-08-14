# CWS Render Optimization Policy Convergence — 2026-08-14

Status: CODE UPDATED / ACTIVE TRACK-A INTEGRATION NEEDS RUNTIME VERIFICATION

## Founder intent

Reuse lessons already researched from mature Blender/GitHub projects to make Track A render preparation smarter, while avoiding destructive customer-scene mutation.

## Sources already curated in repository

- `blender/blender` — renderer/source authority and Blender-supported performance controls.
- `blender/cycles` — Cycles behavior/source authority.
- `DLR-RM/BlenderProc` — modular, deterministic headless processing stages.
- `zeux/meshoptimizer` — measure geometry and preserve semantics; lower polygon count is not proof of identical render output.
- `BinomialLLC/basis_universal` — texture compression is a quality/runtime/storage trade-space, not a universal Cycles speedup.
- `franMarz/TexTools-Blender` and `ucupumar/ucupaint` — material/texture operations require semantic awareness.
- `Moo-Ack-Productions/MCprep` — performance toggles are scene/quality dependent rather than universal presets.
- NVIDIA Omniverse Blender scene-optimizer work — optimization should be decomposed into optional operations with explicit preconditions.

Canonical specialist references:

- `knowledge/github-patterns/01-blender-render-farm/BLEND_FILE_OPTIMIZATION.md`
- `worker/render/BLENDER_CYCLES_OPTIMIZATION_KNOWLEDGE.md`

## Changes applied on main

### `worker/blender_optimizer.py`

Updated to `cws.optimization-plan.v2` behavior:

- customer original is never overwritten;
- optimization happens on a derived working copy;
- Persistent Data is the only currently applyable operational optimization in this helper, and only for multi-frame workloads when explicitly invoked with `--apply-safe`;
- Adaptive Sampling, Noise Threshold/Samples, denoising, light paths/caustics/clamp, texture changes and geometry changes remain benchmark/diagnostic candidates;
- geometry/material/light/camera/resolution mutation is explicitly blocked without a quality policy;
- Blender subprocess uses `--disable-autoexec` for this analysis/optimization helper;
- failed Blender execution reports bounded diagnostic output rather than silently succeeding.

### `worker/archviz_profiles.json`

Replaced coarse `SAFE/BALANCED/MAX_QUALITY` presets with workload-oriented profiles:

- `ARCHVIZ_INTERIOR`
- `ARCHVIZ_EXTERIOR`
- `BLENDER_ANIMATION`
- `BLENDER_GENERAL`
- `VOLUME_VFX`

Each profile separates:

`observe -> safe_operational -> benchmark_only -> do_not_auto_change`

The profile is routing/diagnostic metadata; scene characteristics remain the main technical decision input.

## Important active-worker finding

Current `cws_worker_full.py` contains an older embedded optimization policy that labels several quality-sensitive mutations as automatic/safe, including examples such as sample reduction, caustics/clamp changes and Simplify-related changes.

That older embedded policy conflicts with the newer canonical research principle:

`OPTIMIZE COMPUTE BEFORE ALTERING APPEARANCE`

and with the current specialist knowledge that samples/noise threshold, caustics, clamp, texture reduction, particles/Simplify and similar operations require benchmark/quality evidence.

There is also an architectural limitation: Track A currently launches a fresh Blender process per frame. Persistent Data cannot provide its normal cross-frame reuse benefit when Blender exits after each frame, so enabling it blindly can retain memory without creating the intended reuse benefit.

## Required convergence before claiming active optimization

Do not claim the new policy is active in the real Track A render path until `cws_worker_full.py` is converged and runtime-tested.

Minimum safe convergence:

1. Keep scene analysis/read-only diagnostics.
2. Stop silently applying quality-sensitive mutations merely because they are labelled `gentle` or `level2_safe` in historical code.
3. Preserve current customer settings by default.
4. Keep device/backend selection and operational reuse as priority optimization candidates.
5. Only enable Persistent Data where the render lifecycle actually reuses one Blender process/project state and memory headroom is acceptable.
6. Benchmark quality-sensitive candidates one variable at a time on a working copy.
7. Keep customer original immutable.
8. Runtime-test the exact Founder-controlled Track A path before promotion.

## Evidence labels

- `worker/blender_optimizer.py`: CODE UPDATED, runtime not yet verified in this commit.
- `worker/archviz_profiles.json`: CONFIG/KNOWLEDGE UPDATED.
- `cws_worker_full.py`: ACTIVE POLICY GAP IDENTIFIED; not modified by this convergence slice.
- Golden E2E: NOT CLAIMED.

## Next smallest safe action

Use Codex/local Windows runtime to integrate the v2 safe policy into `cws_worker_full.py`, remove/disable stale automatic quality mutations, then run one real bounded Blender comparison before syncing the active worker version/release path.
