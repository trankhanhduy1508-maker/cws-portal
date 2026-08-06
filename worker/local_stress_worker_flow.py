"""Run the existing Eevee stress .blend through the local WorkerEngine.

This is a local safety harness, not a backend/scheduler runtime test. It uses
the real WorkerEngine download -> preflight -> Blender -> progress -> output
integrity -> checkpoint -> cleanup path with a file-backed checkpoint store.

Failover rehearsal:
  1. Run Worker A with --stop-after-frame 24.
  2. Run Worker B over the same 1..48 JobSpec and checkpoint root.

Worker B skips verified frames 1..24 and renders only the missing frames. RPC
lease fencing, backend reassign and Admin/Customer state remain unverified by
this local harness.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from worker_engine import (BasicPreflight, BlenderCliRenderer, FilesystemCheckpointStore,
                           JobSpec, OutputIntegrityValidator, RetryableWorkerError,
                           WorkerEngine)


class LocalDownloader:
    def __init__(self, source: Path):
        self.source = source.resolve()

    def download(self, spec: JobSpec, destination: Path) -> Path:
        del spec
        destination.mkdir(parents=True, exist_ok=True)
        target = destination / "project.blend"
        shutil.copy2(self.source, target)
        return target


class LocalReporter:
    def __init__(self, path: Path, worker_id: str, stop_after_frame: int | None):
        self.path = path
        self.worker_id = worker_id
        self.stop_after_frame = stop_after_frame

    def _write(self, event: dict) -> None:
        event = {"timestamp_utc": datetime.now(timezone.utc).isoformat(),
                 "worker_id": self.worker_id, **event}
        with self.path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(event, sort_keys=True) + "\n")

    def stage(self, spec: JobSpec, state: str) -> None:
        self._write({"event": "stage", "state": state, "task_id": spec.task_id})

    def progress(self, spec: JobSpec, frame: int, total: int) -> None:
        self._write({"event": "progress", "frame": frame, "total": total})
        if self.stop_after_frame is not None and frame >= self.stop_after_frame:
            self._write({"event": "simulated_worker_loss", "after_verified_frame": frame})
            raise RetryableWorkerError("simulated Worker interruption after verified checkpoint")

    def complete(self, spec: JobSpec) -> None:
        self._write({"event": "complete", "task_id": spec.task_id})

    def fail(self, spec: JobSpec, category: str, message: str) -> None:
        self._write({"event": "fail", "category": category, "message": message})


class LocalGuard:
    def assert_active(self, spec: JobSpec) -> None:
        del spec

    def heartbeat(self, spec: JobSpec, state: str) -> None:
        del spec, state


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="CWS local WorkerEngine stress flow")
    parser.add_argument("--scene", type=Path, required=True)
    parser.add_argument("--blender", type=Path, required=True)
    parser.add_argument("--worker-id", required=True)
    parser.add_argument("--attempt-id", required=True)
    parser.add_argument("--generation", type=int, required=True)
    parser.add_argument("--frame-start", type=int, default=1)
    parser.add_argument("--frame-end", type=int, default=48)
    parser.add_argument("--stop-after-frame", type=int)
    parser.add_argument("--checkpoint-root", type=Path, required=True)
    parser.add_argument("--evidence-dir", type=Path, required=True)
    return parser.parse_args()


def checkpoint_summary(root: Path, spec: JobSpec) -> dict:
    task_root = root.resolve() / spec.task_id
    frames = []
    for metadata_path in sorted(task_root.glob("frame_*.json")) if task_root.is_dir() else []:
        try:
            record = json.loads(metadata_path.read_text(encoding="utf-8"))
            output = task_root / f"frame_{int(record['frame']):04d}.{spec.output_format}"
            digest = hashlib.sha256(output.read_bytes()).hexdigest() if output.is_file() else None
            frames.append({"frame": int(record["frame"]), "bytes": output.stat().st_size if output.is_file() else 0,
                           "sha256": digest, "metadata_sha256": record.get("sha256"),
                           "verified": output.is_file() and digest == record.get("sha256")})
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            frames.append({"metadata": str(metadata_path), "verified": False})
    return {"task_id": spec.task_id, "verified_frame_count": sum(item.get("verified", False) for item in frames),
            "frames": frames, "total_bytes": sum(item.get("bytes", 0) for item in frames)}


def main() -> int:
    args = parse_args()
    if not args.scene.is_file() or args.scene.suffix.lower() != ".blend":
        print("scene must be an existing .blend file", file=sys.stderr)
        return 2
    if not args.blender.is_file():
        print("Blender executable is unavailable", file=sys.stderr)
        return 2
    if args.stop_after_frame is not None and not args.frame_start <= args.stop_after_frame <= args.frame_end:
        print("stop-after-frame must be within the requested frame range", file=sys.stderr)
        return 2
    spec = JobSpec.from_mapping({
        "job_id": "cws-eevee-stress-job-20260806",
        "task_id": "cws-eevee-stress-task-48f",
        "attempt_id": args.attempt_id,
        "lease_generation": args.generation,
        "project_uri": args.scene.resolve().as_uri(),
        "frame_start": args.frame_start,
        "frame_end": args.frame_end,
        "output_prefix": "local-cws-eevee-stress/",
        "output_format": "png",
        "autoexec": False,
        "required_vram_mb": 0,
        "required_ram_mb": 0,
    })
    args.evidence_dir.mkdir(parents=True, exist_ok=True)
    log_path = args.evidence_dir / f"{args.worker_id}_{args.attempt_id}.jsonl"
    log_path.unlink(missing_ok=True)
    reporter = LocalReporter(log_path, args.worker_id, args.stop_after_frame)
    engine = WorkerEngine(
        workspace_root=args.evidence_dir / "workspace",
        downloader=LocalDownloader(args.scene),
        preflight=BasicPreflight({"vram_mb": 8192, "ram_mb": 16384}),
        renderer=BlenderCliRenderer(args.blender, timeout_seconds=900, use_job_object=True),
        checkpoints=FilesystemCheckpointStore(args.checkpoint_root),
        validator=OutputIntegrityValidator(),
        reporter=reporter,
        guard=LocalGuard(),
    )
    status = "completed"
    error = None
    try:
        engine.run(spec)
    except RetryableWorkerError as exc:
        status = "simulated_interruption" if args.stop_after_frame is not None else "retryable_failure"
        error = str(exc)
    except Exception as exc:
        status = "failure"
        error = f"{type(exc).__name__}: {exc}"
    summary = {
        "status": status, "worker_id": args.worker_id, "attempt_id": args.attempt_id,
        "generation": args.generation, "scene": str(args.scene.resolve()),
        "frame_range": [args.frame_start, args.frame_end], "error": error,
        "checkpoint": checkpoint_summary(args.checkpoint_root, spec),
        "progress_log": str(log_path),
    }
    summary_path = args.evidence_dir / f"{args.worker_id}_{args.attempt_id}.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    if status == "completed":
        return 0
    if status == "simulated_interruption":
        return 3
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
