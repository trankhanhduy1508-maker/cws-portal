"""Credential-gated staging runner for the P0 Node Agent E2E path.

This runner is intentionally separate from the local-only staging_runtime.py.
It uses only CWS_STAGING_* configuration, claims one complete JobSpec, starts
one child Generic Worker, and returns to ACTIVE_IDLE after completion/failure.
It never falls back to production RPCs or legacy Worker artifacts.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
import urllib.request
from urllib.parse import unquote, urlsplit
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from node_agent import Job, NodeAgent, WorkerResult
from staging_adapters import B2StagingCheckpointStore, StagingConfig, SupabaseStagingRpc
from worker_engine import (BasicPreflight, BlenderCliRenderer, JobSpec,
                           OutputIntegrityValidator, PermanentWorkerError,
                           RetryableWorkerError, WorkerEngine)


class StagingProjectDownloader:
    def download(self, spec: JobSpec, destination: Path) -> Path:
        destination.mkdir(parents=True, exist_ok=True)
        target = destination / "project.blend"
        uri = spec.project_uri
        if uri.startswith("file://"):
            parsed = urlsplit(uri)
            raw_path = unquote(parsed.path)
            # RFC file URIs use /C:/... on Windows; pathlib expects C:/....
            if len(raw_path) >= 3 and raw_path[0] == "/" and raw_path[2] == ":":
                raw_path = raw_path[1:]
            source = Path(raw_path).resolve()
            if not source.is_file():
                raise PermanentWorkerError("staging project file is unavailable")
            shutil.copy2(source, target)
            return target
        if not (uri.startswith("https://") or uri.startswith("http://")):
            raise PermanentWorkerError("staging project_uri must be file:// or https://")
        try:
            with urllib.request.urlopen(uri, timeout=60) as response, target.open("wb") as stream:
                shutil.copyfileobj(response, stream)
        except Exception as exc:
            raise RetryableWorkerError("staging project download failed") from exc
        return target


class StagingReporter:
    def __init__(self, rpc: SupabaseStagingRpc):
        self.rpc = rpc

    @staticmethod
    def _task_id(spec: JobSpec) -> int:
        try:
            return int(spec.task_id)
        except ValueError as exc:
            raise PermanentWorkerError("staging task_id must be numeric") from exc

    def stage(self, spec: JobSpec, state: str) -> None:
        self.rpc.transition(state, self._task_id(spec), "generic_worker")

    def progress(self, spec: JobSpec, frame: int, total: int) -> None:
        return None

    def complete(self, spec: JobSpec) -> None:
        if not self.rpc.complete(self._task_id(spec), spec.lease_generation):
            raise RetryableWorkerError("staging completion was rejected")

    def fail(self, spec: JobSpec, category: str, message: str) -> None:
        self.rpc.fail(self._task_id(spec), spec.lease_generation, category)


class StagingLeaseGuard:
    def __init__(self, rpc: SupabaseStagingRpc):
        self.rpc = rpc

    def assert_active(self, spec: JobSpec) -> None:
        return None

    def heartbeat(self, spec: JobSpec, state: str) -> None:
        if not self.rpc.report_heartbeat(int(spec.task_id), spec.lease_generation):
            raise RetryableWorkerError("staging lease heartbeat was rejected")


def run_child(args: argparse.Namespace) -> int:
    config = StagingConfig.from_env()
    rpc = SupabaseStagingRpc(config)
    spec = JobSpec.from_mapping(json.loads(args.spec.read_text(encoding="utf-8")))
    engine = WorkerEngine(
        workspace_root=args.root / "work",
        downloader=StagingProjectDownloader(),
        preflight=BasicPreflight({"vram_mb": args.vram_mb, "ram_mb": args.ram_mb}),
        renderer=BlenderCliRenderer(args.blender, timeout_seconds=args.timeout,
                                     use_job_object=True),
        checkpoints=B2StagingCheckpointStore(config),
        validator=OutputIntegrityValidator(),
        reporter=StagingReporter(rpc),
        guard=StagingLeaseGuard(rpc),
    )
    engine.run(spec)
    return 0


def run_parent(args: argparse.Namespace) -> int:
    config = StagingConfig.from_env()
    rpc = SupabaseStagingRpc(config)
    rpc.register_worker(args.gpu_name, args.vram_mb)
    claimed: list[Job] = []

    def poll_job() -> Job | None:
        if claimed:
            return None
        result = rpc.claim_next(args.vram_mb)
        spec = rpc.assignment_to_job_spec(result)
        if spec is None:
            return None
        claimed.append(Job(spec.job_id, spec))
        args.root.mkdir(parents=True, exist_ok=True)
        args.spec.write_text(json.dumps(spec.__dict__, sort_keys=True), encoding="utf-8")
        return claimed[0]

    def heartbeat() -> None:
        rpc.worker_ping()

    def prepare_job(job: Job) -> None:
        rpc.transition("PREPARING", int(job.payload.task_id), "job_claimed")

    def launch_worker(job: Job) -> subprocess.Popen:
        rpc.transition("WORKER_START", int(job.payload.task_id), "generic_worker_start")
        command = [sys.executable, str(Path(__file__).resolve()), "--child",
                   "--spec", str(args.spec), "--blender", str(args.blender),
                   "--root", str(args.root), "--timeout", str(args.timeout),
                   "--vram-mb", str(args.vram_mb), "--ram-mb", str(args.ram_mb)]
        return subprocess.Popen(command, cwd=Path(__file__).resolve().parent.parent)

    def inspect_worker(process: subprocess.Popen) -> WorkerResult:
        if process.poll() is None:
            return WorkerResult("running")
        if process.returncode == 0:
            return WorkerResult("completed", "worker_exit_0")
        return WorkerResult("failed", f"worker_exit_{process.returncode}")

    def cleanup_job(job: Job, result: WorkerResult) -> None:
        rpc.transition("ACTIVE_IDLE", int(job.payload.task_id), "cleanup_complete")
        args.spec.unlink(missing_ok=True)

    agent = NodeAgent(poll_job, heartbeat, prepare_job, launch_worker,
                      inspect_worker, cleanup_job, time.monotonic,
                      heartbeat_interval=args.heartbeat_interval, max_retries=0,
                      non_blocking_heartbeat=True)
    deadline = time.monotonic() + args.max_seconds
    while time.monotonic() < deadline:
        agent.tick()
        if agent.state.value == "ACTIVE_IDLE" and agent.job is None and claimed:
            return 0 if agent.last_result.status == "completed" else 1
        time.sleep(args.poll_seconds)
    return 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--child", action="store_true")
    parser.add_argument("--spec", type=Path, default=Path("staging-job-spec.json"))
    parser.add_argument("--blender", type=Path, required=True)
    parser.add_argument("--root", type=Path, default=Path("staging-e2e"))
    parser.add_argument("--timeout", type=int, default=3600)
    parser.add_argument("--vram-mb", type=int, default=0)
    parser.add_argument("--ram-mb", type=int, default=0)
    parser.add_argument("--gpu-name", default=None)
    parser.add_argument("--heartbeat-interval", type=float, default=20.0)
    parser.add_argument("--poll-seconds", type=float, default=2.0)
    parser.add_argument("--max-seconds", type=int, default=86400)
    args = parser.parse_args(argv)
    return run_child(args) if args.child else run_parent(args)


if __name__ == "__main__":
    raise SystemExit(main())
