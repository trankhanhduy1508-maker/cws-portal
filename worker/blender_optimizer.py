"""CWS Blender optimization planner/applicator.

This module applies only derived-working-copy, output-preserving operational
optimizations. It deliberately keeps quality-sensitive ideas as benchmark
candidates instead of silently mutating paid customer scenes.

Research basis already captured in this repository:
- Blender/Blender Cycles: version-grounded render/performance controls;
- BlenderProc: modular inspect -> plan -> apply pipeline;
- meshoptimizer: measure geometry before simplification; do not infer visual
  equivalence from lower polygon count;
- basis_universal / TexTools / Ucupaint: texture/material transformations are
  quality-sensitive and must not be treated as universal render-speed fixes;
- MCprep / Omniverse scene optimizer: decompose optimizations into explicit,
  independently verifiable operations rather than one destructive preset.

The immutable customer original is never saved over by this module.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path


BLENDER_SCRIPT = r'''
import bpy, json, sys
args = sys.argv[sys.argv.index("--") + 1:]
mode, output = args[0], args[1]
scene = bpy.context.scene
cycles = scene.cycles if scene.render.engine == "CYCLES" and hasattr(scene, "cycles") else None
multi_frame = int(scene.frame_end) > int(scene.frame_start)

before = {
    "engine": scene.render.engine,
    "frame_start": int(scene.frame_start),
    "frame_end": int(scene.frame_end),
    "multi_frame": multi_frame,
    "persistent_data": bool(getattr(scene.render, "use_persistent_data", False)),
    "cycles_adaptive_sampling": bool(getattr(cycles, "use_adaptive_sampling", False)) if cycles else None,
    "cycles_noise_threshold": float(getattr(cycles, "adaptive_threshold", 0.0)) if cycles else None,
    "cycles_samples": int(getattr(cycles, "samples", 0)) if cycles else None,
}

plan = []

# Tier A: operational/reuse optimization. Persistent Data is still conditional
# on a multi-frame workload because it trades memory for reuse; CWS applies it
# only to the derived working copy and only when explicitly asked to apply the
# safe plan.
if multi_frame and not before["persistent_data"]:
    plan.append({
        "tier": "SAFE_OPERATIONAL",
        "setting": "persistent_data",
        "action": "enable_on_working_copy",
        "why": "reuse prepared render data across repeated frames",
        "quality_risk": "none_expected",
        "resource_tradeoff": "higher_memory_retention",
        "reversible": True,
    })
else:
    plan.append({
        "tier": "SAFE_OPERATIONAL",
        "setting": "persistent_data",
        "action": "no_change",
        "reason": "single-frame workload or already enabled",
    })

# Tier B: benchmark candidates. Research sources consistently show these can
# materially change convergence/noise/lighting or visible detail, so they are
# never silently applied here.
if cycles:
    plan.extend([
        {
            "tier": "BENCHMARK_CANDIDATE",
            "setting": "adaptive_sampling",
            "action": "proposal_only",
            "current": before["cycles_adaptive_sampling"],
            "why": "may stop sampling early in converged regions",
            "quality_risk": "noise_convergence_tradeoff",
        },
        {
            "tier": "BENCHMARK_CANDIDATE",
            "setting": "samples_noise_threshold",
            "action": "proposal_only",
            "current_samples": before["cycles_samples"],
            "current_noise_threshold": before["cycles_noise_threshold"],
            "why": "sampling cost can dominate Cycles render time",
            "quality_risk": "visible_noise_or_detail_change",
        },
        {
            "tier": "BENCHMARK_CANDIDATE",
            "setting": "light_paths_caustics_clamp",
            "action": "proposal_only",
            "why": "can reduce expensive paths/fireflies in some scenes",
            "quality_risk": "lighting_energy_or_caustics_change",
        },
    ])

plan.extend([
    {
        "tier": "BENCHMARK_CANDIDATE",
        "setting": "texture_footprint",
        "action": "measure_only",
        "why": "large textures affect RAM/VRAM and preparation cost",
        "quality_risk": "downscaling_or_conversion_can_change_materials",
    },
    {
        "tier": "DO_NOT_AUTO_CHANGE",
        "setting": "geometry_materials_lights_resolution",
        "action": "forbidden_without_explicit_quality_policy",
        "why": "mesh simplification, material flattening, light changes and resolution changes alter customer intent",
    },
])

applied = []
if mode == "apply-safe":
    if multi_frame and not before["persistent_data"]:
        scene.render.use_persistent_data = True
        applied.append("persistent_data")
    # Save ONLY the derived working copy path passed by the parent process.
    bpy.ops.wm.save_as_mainfile(filepath=output)

after = {
    "engine": scene.render.engine,
    "persistent_data": bool(getattr(scene.render, "use_persistent_data", False)),
}

with open(output + ".plan.json", "w", encoding="utf-8") as stream:
    json.dump({
        "schema_version": "cws.optimization-plan.v2",
        "policy": "optimize_compute_before_altering_appearance",
        "before": before,
        "after": after,
        "plan": plan,
        "applied": applied,
        "customer_original_mutated": False,
    }, stream, indent=2, sort_keys=True)
'''


def run(blender: Path, source: Path, working_copy: Path, apply_safe: bool) -> Path:
    """Plan/apply safe optimization on a derived working copy only."""
    if source.resolve() == working_copy.resolve():
        raise ValueError("working copy must differ from original")
    if not source.exists():
        raise FileNotFoundError(source)

    working_copy.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, working_copy)
    script = working_copy.with_suffix(".optimizer.py")
    script.write_text(BLENDER_SCRIPT, encoding="utf-8")
    try:
        mode = "apply-safe" if apply_safe else "plan"
        command = [
            str(blender),
            "--background",
            "--disable-autoexec",
            str(working_copy),
            "--python",
            str(script),
            "--",
            mode,
            str(working_copy),
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            tail = ((result.stdout or "") + "\n" + (result.stderr or ""))[-1200:]
            raise RuntimeError(f"Blender optimizer failed: exit {result.returncode}; tail={tail}")
        plan_path = Path(str(working_copy) + ".plan.json")
        if not plan_path.exists():
            raise RuntimeError("optimizer completed without a plan file")
        return plan_path
    finally:
        script.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="CWS safe Blender optimization planner")
    parser.add_argument("--blender", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--working-copy", type=Path, required=True)
    parser.add_argument("--apply-safe", action="store_true", help="apply only SAFE_OPERATIONAL changes")
    args = parser.parse_args()
    print(run(args.blender, args.source, args.working_copy, args.apply_safe))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
