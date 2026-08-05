"""Plan/apply one safe Blender optimization on a working copy only."""
from __future__ import annotations
import argparse
import shutil
import subprocess
from pathlib import Path

BLENDER_SCRIPT = r'''
import bpy, json, sys
args = sys.argv[sys.argv.index("--") + 1:]
mode, output, do_apply = args[0], args[1], args[2] == "1"
scene = bpy.context.scene
before = {"engine": scene.render.engine, "frame_start": scene.frame_start, "frame_end": scene.frame_end, "persistent_data": bool(getattr(scene.render, "use_persistent_data", False))}
plan = []
if scene.render.engine == "CYCLES" and scene.frame_end > scene.frame_start and not before["persistent_data"]:
    plan.append({"class": "SAFE_AUTO", "setting": "persistent_data", "action": "enable_on_working_copy", "expected_speedup": "benchmark_required", "quality_risk": "memory_growth", "reversible": True})
else:
    plan.append({"class": "SAFE_AUTO", "setting": "persistent_data", "action": "no_change", "reason": "not a multi-frame Cycles scene or already enabled"})
plan.append({"class": "CONDITIONAL", "setting": "adaptive_sampling_denoise", "action": "proposal_only", "quality_risk": "noise/detail tradeoff", "reversible": True})
plan.append({"class": "QUALITY_TRADEOFF", "setting": "bounce_samples_resolution", "action": "proposal_only", "quality_risk": "visible image change", "reversible": True})
if mode == "apply" and do_apply and scene.render.engine == "CYCLES" and scene.frame_end > scene.frame_start:
    scene.render.use_persistent_data = True
    bpy.ops.wm.save_as_mainfile(filepath=output)
after = {"engine": scene.render.engine, "persistent_data": bool(getattr(scene.render, "use_persistent_data", False))}
with open(output + ".plan.json", "w", encoding="utf-8") as stream:
    json.dump({"schema_version":"cws.optimization-plan.v1", "before":before, "after":after, "plan":plan, "applied":mode == "apply" and do_apply}, stream, indent=2, sort_keys=True)
'''

def run(blender: Path, source: Path, working_copy: Path, apply: bool) -> Path:
    if source.resolve() == working_copy.resolve():
        raise ValueError("working copy must differ from original")
    working_copy.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, working_copy)
    script = working_copy.with_suffix(".optimizer.py")
    script.write_text(BLENDER_SCRIPT, encoding="utf-8")
    try:
        mode = "apply" if apply else "plan"
        command = [str(blender), "--background", "--disable-autoexec", str(working_copy), "--python", str(script), "--", mode, str(working_copy), "1" if apply else "0"]
        result = subprocess.run(command, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise RuntimeError(f"Blender optimizer failed: exit {result.returncode}")
        return working_copy.with_suffix(".plan.json")
    finally:
        script.unlink(missing_ok=True)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--blender", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--working-copy", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    print(run(args.blender, args.source, args.working_copy, args.apply))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
