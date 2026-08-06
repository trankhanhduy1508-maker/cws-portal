"""Bounded local Blender Eevee stress runner.

This runner never contacts CWS, Supabase, B2 or production. It records process
output and best-effort host metrics, and exits non-zero on timeout/render error.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--blender", required=True, type=Path)
    parser.add_argument("--scene", type=Path,
                        default=Path("tests/assets/cws_blender_unoptimized_eevee_stress.blend"))
    parser.add_argument("--scene-script", type=Path,
                        default=Path("tests/blender/create_unoptimized_eevee_stress_scene.py"))
    parser.add_argument("--profile", choices=("heavy-single", "heavy-animation"), default="heavy-single")
    parser.add_argument("--output-dir", type=Path, default=Path("tests/artifacts/eevee-stress"))
    parser.add_argument("--timeout-seconds", type=int, default=900)
    parser.add_argument("--generate", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def optional_metrics(pid: int) -> dict:
    metrics: dict = {}
    try:
        import psutil  # type: ignore
    except ImportError:
        psutil = None
    if psutil is not None:
        try:
            process = psutil.Process(pid)
            metrics["rss_bytes"] = process.memory_info().rss
            metrics["cpu_percent"] = process.cpu_percent(interval=0.1)
        except psutil.Error:
            pass
    nvidia = shutil.which("nvidia-smi")
    if nvidia:
        result = subprocess.run(
            [nvidia, "--query-gpu=utilization.gpu,memory.used,memory.total",
             "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            metrics["nvidia_smi"] = result.stdout.strip()
    return metrics


def run_command(command: list[str], log_path: Path, timeout: int) -> tuple[int, str, dict, float]:
    started = time.monotonic()
    with log_path.open("w", encoding="utf-8") as log:
        process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                   text=True, cwd=Path.cwd())
        peak: dict = {}
        timed_out = False
        while process.poll() is None:
            sample = optional_metrics(process.pid)
            if sample.get("rss_bytes", 0) > peak.get("rss_bytes", 0):
                peak.update(sample)
            if time.monotonic() - started > timeout:
                timed_out = True
                process.kill()
                break
            time.sleep(1)
        process.wait()
    return (124 if timed_out else process.returncode, "TIMEOUT" if timed_out else "EXIT", peak,
            round(time.monotonic() - started, 3))


def main() -> int:
    args = parse_args()
    blender = args.blender.resolve()
    if not blender.is_file():
        print(f"BLOCKED: Blender executable not found: {blender}", file=sys.stderr)
        return 2
    args.output_dir.mkdir(parents=True, exist_ok=True)
    scene = args.scene.resolve()
    scene_log = args.output_dir / "scene_generation.log"
    if args.generate or not scene.is_file():
        generation = [str(blender), "-b", "-noaudio", "--disable-autoexec", "--python",
                      str(args.scene_script.resolve()), "--", "--output", str(scene),
                      "--profile", args.profile]
        code, state, metrics, generation_seconds = run_command(
            generation, scene_log, min(args.timeout_seconds, 300)
        )
        if code != 0 or not scene.is_file():
            print(f"SCENE_GENERATION_{state}: exit={code}", file=sys.stderr)
            return 1
    # Blender's Windows CLI can mis-normalize a backslash path containing a
    # user profile segment. Forward slashes preserve the intended absolute
    # artifact directory on Windows and POSIX.
    output_prefix = args.output_dir.resolve() / "frame_####"
    blender_output_prefix = output_prefix.as_posix()
    render_log = args.output_dir / f"render_{args.profile}.log"
    command = [str(blender), "-b", "-noaudio", "--disable-autoexec", str(scene),
               "-o", blender_output_prefix, "-F", "PNG"]
    command += ["-f", "1"] if args.profile == "heavy-single" else ["-s", "1", "-e", "48", "-a"]
    code, state, peak, render_seconds = run_command(command, render_log, args.timeout_seconds)
    outputs = sorted(args.output_dir.glob("frame_*.png"))
    report = {
        "timestamp_utc": utc_now(), "profile": args.profile,
        "engine_expected": "BLENDER_EEVEE or BLENDER_EEVEE_NEXT",
        "scene": str(scene), "resolution": "1280x720", "frames": 1 if args.profile == "heavy-single" else 48,
        "exit_code": code, "state": state, "render_seconds": render_seconds,
        "output_files": [str(p) for p in outputs],
        "output_bytes": sum(p.stat().st_size for p in outputs), "peak_metrics": peak,
        "worker_flow": "NOT RUN: local bounded Blender runner only",
        "failover": "NOT RUN: requires staging Worker A/B and authenticated backend",
    }
    (args.output_dir / "benchmark.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if code == 0 and outputs else 1


if __name__ == "__main__":
    raise SystemExit(main())
