"""Safe Windows staging harness for the generic Worker + Node Agent loop.

This is intentionally not a production adapter: it uses only a caller-supplied
local .blend, local checkpoints and local JSON evidence. It never claims a
Supabase lease and never talks to B2. The purpose is to verify real Node Agent
process supervision and Blender execution without touching production.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from node_agent import Job, NodeAgent, WorkerResult
from worker_engine import (BasicPreflight, BlenderCliRenderer,
                           FilesystemCheckpointStore, JobSpec,
                           OutputIntegrityValidator, WorkerEngine)


class LocalDownloader:
    def __init__(self, source: Path):
        self.source = source.resolve()

    def download(self, spec: JobSpec, destination: Path) -> Path:
        destination.mkdir(parents=True, exist_ok=True)
        target = destination / "project.blend"
        shutil.copy2(self.source, target)
        return target


class LocalReporter:
    def __init__(self, path: Path):
        self.path = path

    def _write(self, event: dict) -> None:
        with self.path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(event, sort_keys=True) + "\n")

    def stage(self, spec: JobSpec, state: str) -> None:
        self._write({"event": "stage", "state": state})

    def progress(self, spec: JobSpec, frame: int, total: int) -> None:
        self._write({"event": "progress", "frame": frame, "total": total})

    def complete(self, spec: JobSpec) -> None:
        self._write({"event": "complete", "task_id": spec.task_id})

    def fail(self, spec: JobSpec, category: str, message: str) -> None:
        self._write({"event": "fail", "category": category, "message": message})


class LocalGuard:
    def assert_active(self, spec: JobSpec) -> None:
        return None

    def heartbeat(self, spec: JobSpec, state: str) -> None:
        return None


def run_child(args: argparse.Namespace) -> int:
    if args.crash_once and not args.crash_marker.exists():
        args.crash_marker.write_text("crashed-once", encoding="utf-8")
        return 17
    spec = JobSpec.from_mapping(json.loads(args.job_spec.read_text(encoding="utf-8")))
    engine = WorkerEngine(
        workspace_root=args.root / "work",
        downloader=LocalDownloader(args.project),
        preflight=BasicPreflight({"vram_mb": args.vram_mb, "ram_mb": args.ram_mb}),
        renderer=BlenderCliRenderer(args.blender, timeout_seconds=args.timeout,
                                     use_job_object=True),
        checkpoints=FilesystemCheckpointStore(args.root / "checkpoints"),
        validator=OutputIntegrityValidator(),
        reporter=LocalReporter(args.events),
        guard=LocalGuard(),
    )
    engine.run(spec)
    args.result.write_text(json.dumps({"status": "completed"}), encoding="utf-8")
    return 0


def run_parent(args: argparse.Namespace) -> int:
    spec = JobSpec.from_mapping(json.loads(args.job_spec.read_text(encoding="utf-8")))
    args.root.mkdir(parents=True, exist_ok=True)
    args.events.write_text("", encoding="utf-8")
    args.result.unlink(missing_ok=True)
    jobs = iter([Job(spec.task_id, spec)])

    def poll_job():
        return next(jobs, None)

    def heartbeat():
        with args.events.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps({"event": "node_heartbeat"}) + "\n")

    def prepare_job(job):
        JobSpec.from_mapping(json.loads(args.job_spec.read_text(encoding="utf-8")))

    def launch_worker(job):
        command = [sys.executable, str(Path(__file__).resolve()), "--child",
                   "--job-spec", str(args.job_spec), "--project", str(args.project),
                   "--blender", str(args.blender), "--root", str(args.root),
                   "--events", str(args.events), "--result", str(args.result),
                   "--timeout", str(args.timeout), "--vram-mb", str(args.vram_mb),
                   "--ram-mb", str(args.ram_mb),
                   "--crash-once" if args.crash_once else "",
                   "--crash-marker", str(args.crash_marker)]
        command = [item for item in command if item != ""]
        return subprocess.Popen(command, cwd=Path(__file__).resolve().parent.parent)

    def inspect_worker(process):
        if process.poll() is None:
            return WorkerResult("running")
        if process.returncode == 0 and args.result.exists():
            return WorkerResult("completed", "worker_exit_0")
        return WorkerResult("retryable", f"worker_exit_{process.returncode}")

    def cleanup_job(job, result):
        args.events.write_text(args.events.read_text(encoding="utf-8") +
                               json.dumps({"event": "node_cleanup", "status": result.status}) + "\n",
                               encoding="utf-8")

    agent = NodeAgent(poll_job, heartbeat, prepare_job, launch_worker,
                      inspect_worker, cleanup_job, time.monotonic,
                      heartbeat_interval=0.01, max_retries=1 if args.crash_once else 0,
                      non_blocking_heartbeat=True)
    deadline = time.monotonic() + args.max_seconds
    last_state = None
    while time.monotonic() < deadline:
        agent.tick()
        if agent.state.value != last_state:
            with args.events.open("a", encoding="utf-8") as stream:
                stream.write(json.dumps({"event": "node_state", "state": agent.state.value}) + "\n")
            last_state = agent.state.value
        if agent.state.value == "ACTIVE_IDLE" and agent.job is None and args.result.exists():
            print(json.dumps({"state": agent.state.value, "result": "completed"}))
            return 0
        time.sleep(0.05)
    print(json.dumps({"state": agent.state.value, "result": "timeout"}))
    return 2


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--child", action="store_true")
    parser.add_argument("--job-spec", type=Path, required=True)
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--blender", type=Path, required=True)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--result", type=Path, required=True)
    parser.add_argument("--timeout", type=int, default=3600)
    parser.add_argument("--vram-mb", type=int, default=0)
    parser.add_argument("--ram-mb", type=int, default=0)
    parser.add_argument("--crash-once", action="store_true")
    parser.add_argument("--crash-marker", type=Path, default=Path("staging-crash.marker"))
    parser.add_argument("--max-seconds", type=int, default=180)
    args = parser.parse_args()
    return run_child(args) if args.child else run_parent(args)


if __name__ == "__main__":
    raise SystemExit(main())
