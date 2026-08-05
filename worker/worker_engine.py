­r^Ñf¥Ø¦{]¬yÊ'vÃ®¶­"""Generic CWS render engine.

The engine is intentionally job-data driven. A Node Agent supplies one
authorized JobSpec per attempt; this module contains no customer/job IDs,
credentials, scheduler policy, or power-management behavior.

Adapters are injected so the control plane can be wired to the current
backend/B2 implementation without coupling the render process to secrets.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Protocol, Sequence


_SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")


class WorkerEngineError(RuntimeError):
    """A job attempt cannot continue safely."""


class RetryableWorkerError(WorkerEngineError):
    """The control plane may retry this attempt under its policy."""


class PermanentWorkerError(WorkerEngineError):
    """The project/spec is not safe or valid for this attempt."""


@dataclass(frozen=True)
class JobSpec:
    job_id: str
    task_id: str
    attempt_id: str
    lease_generation: int
    project_uri: str
    frame_start: int
    frame_end: int
    output_prefix: str
    output_format: str
    autoexec: bool = False

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> "JobSpec":
        required = ("job_id", "task_id", "attempt_id", "lease_generation", "project_uri",
                    "frame_start", "frame_end", "output_prefix", "output_format")
        missing = [key for key in required if key not in value]
        if missing:
            raise PermanentWorkerError(f"JobSpec missing fields: {', '.join(missing)}")
        ids = ("job_id", "task_id", "attempt_id")
        for key in ids:
            item = str(value[key])
            if not _SAFE_ID.fullmatch(item):
                raise PermanentWorkerError(f"invalid {key}")
        start, end = int(value["frame_start"]), int(value["frame_end"])
        if start < 0 or end < start or end - start > 100000:
            raise PermanentWorkerError("invalid frame range")
        if not str(value["project_uri"]).strip():
            raise PermanentWorkerError("project_uri is required")
        if bool(value.get("autoexec", False)):
            raise PermanentWorkerError("customer autoexec is disabled by policy")
        return cls(
            job_id=str(value["job_id"]),
            task_id=str(value["task_id"]),
            attempt_id=str(value["attempt_id"]),
            lease_generation=int(value["lease_generation"]),
            project_uri=str(value["project_uri"]),
            frame_start=start,
            frame_end=end,
            output_prefix=str(value["output_prefix"]),
            output_format=str(value["output_format"]),
            autoexec=False,
        )


class Reporter(Protocol):
    def stage(self, spec: JobSpec, state: str) -> None: ...
    def progress(self, spec: JobSpec, frame: int, total: int) -> None: ...
    def complete(self, spec: JobSpec) -> None: ...
    def fail(self, spec: JobSpec, category: str, message: str) -> None: ...


class ProjectDownloader(Protocol):
    def download(self, spec: JobSpec, destination: Path) -> Path: ...


class Preflight(Protocol):
    def inspect(self, spec: JobSpec, project: Path) -> None: ...


class Renderer(Protocol):
    def render(self, spec: JobSpec, project: Path, frame: int, output: Path) -> Path: ...


class CheckpointStore(Protocol):
    def is_verified(self, spec: JobSpec, frame: int) -> bool: ...
    def put(self, spec: JobSpec, frame: int, output: Path) -> None: ...
    def verify(self, spec: JobSpec, frame: int, output: Path) -> None: ...


class OutputValidator(Protocol):
    def validate(self, output: Path) -> None: ...


def _inside(root: Path, child: Path) -> bool:
    try:
        child.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


class BasicPreflight:
    """Safe filesystem-only preflight; it never executes customer code."""

    def inspect(self, spec: JobSpec, project: Path) -> None:
        if project.suffix.lower() != ".blend" or not project.is_file():
            raise PermanentWorkerError("project is not a readable .blend file")


class BasicOutputValidator:
    def __init__(self, minimum_bytes: int = 200):
        self.minimum_bytes = minimum_bytes

    def validate(self, output: Path) -> None:
        if not output.is_file() or output.stat().st_size < self.minimum_bytes:
            raise RetryableWorkerError(f"invalid render output: {output.name}")


class BlenderCliRenderer:
    """Render one frame with customer auto-execution disabled."""

    def __init__(self, executable: Path, timeout_seconds: int = 3600):
        self.executable = executable.resolve()
        self.timeout_seconds = timeout_seconds

    def render(self, spec: JobSpec, project: Path, frame: int, output: Path) -> Path:
        if not self.executable.is_file():
            raise RetryableWorkerError("Blender executable is unavailable")
        output.parent.mkdir(parents=True, exist_ok=True)
        pattern = str(output.parent / "frame_####")
        command = [str(self.executable), "--background", str(project),
                   "--disable-autoexec", "--python-exit-code", "1",
                   "--render-output", pattern, "--render-frame", str(frame)]
        try:
            result = subprocess.run(command, capture_output=True, text=True,
                                    timeout=self.timeout_seconds, check=False)
        except subprocess.TimeoutExpired as exc:
            raise RetryableWorkerError("Blender render timed out") from exc
        if result.returncode != 0:
            text = f"{result.stdout}\n{result.stderr}".lower()
            category = "permanent" if any(x in text for x in ("cannot read", "missing", "invalid")) else "retryable"
            error = PermanentWorkerError if category == "permanent" else RetryableWorkerError
            raise error(f"Blender failed with exit code {result.returncode}")
        rendered = output.parent / f"frame_{frame:04d}.png"
        if not rendered.is_file():
            raise RetryableWorkerError("Blender completed without expected output")
        return rendered


class WorkerEngine:
    """Execute one dynamically supplied task attempt, then exit."""

    def __init__(self, workspace_root: Path, downloader: ProjectDownloader,
                 preflight: Preflight, renderer: Renderer,
                 checkpoints: CheckpointStore, validator: OutputValidator,
                 reporter: Reporter):
        self.workspace_root = workspace_root.resolve()
        self.downloader = downloader
        self.preflight = preflight
        self.renderer = renderer
        self.checkpoints = checkpoints
        self.validator = validator
        self.reporter = reporter

    def run(self, spec: JobSpec) -> None:
        self.workspace_root.mkdir(parents=True, exist_ok=True)
        job_root = (self.workspace_root / spec.task_id).resolve()
        if not _inside(self.workspace_root, job_root):
            raise PermanentWorkerError("job workspace escaped workspace root")
        job_root.mkdir(parents=True, exist_ok=True)
        try:
            self.reporter.stage(spec, "DOWNLOADING")
            project = self.downloader.download(spec, job_root)
            project = project.resolve()
            if not _inside(job_root, project):
                raise PermanentWorkerError("downloaded project escaped job workspace")
            self.reporter.stage(spec, "PREFLIGHT")
            self.preflight.inspect(spec, project)
            self.reporter.stage(spec, "PREPARING")
            total = spec.frame_end - spec.frame_start + 1
            for frame in range(spec.frame_start, spec.frame_end + 1):
                if self.checkpoints.is_verified(spec, frame):
                    self.reporter.progress(spec, frame, total)
                    continue
                self.reporter.stage(spec, "RENDERING")
                output = job_root / f"frame_{frame:04d}.{spec.output_format.lstrip('.') }"
                rendered = self.renderer.render(spec, project, frame, output)
                self.validator.validate(rendered)
                self.reporter.stage(spec, "UPLOADING")
                self.checkpoints.put(spec, frame, rendered)
                self.reporter.stage(spec, "VERIFYING")
                self.checkpoints.verify(spec, frame, rendered)
                self.reporter.progress(spec, frame, total)
            self.reporter.complete(spec)
        except (PermanentWorkerError, RetryableWorkerError) as exc:
            category = "permanent" if isinstance(exc, PermanentWorkerError) else "retryable"
            self.reporter.fail(spec, category, str(exc))
            raise
        except Exception as exc:
            self.reporter.fail(spec, "retryable", f"unexpected engine error: {type(exc).__name__}")
            raise RetryableWorkerError("unexpected engine error") from exc
        finally:
            if job_root.exists() and _inside(self.workspace_root, job_root):
                shutil.rmtree(job_root)


def load_job_spec(path: Path) -> JobSpec:
    return JobSpec.from_mapping(json.loads(path.read_text(encoding="utf-8")))


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate a generic CWS JobSpec")
    parser.add_argument("--job-spec", type=Path, required=True)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args(argv)
    load_job_spec(args.job_spec)
    if not args.validate_only:
        parser.error("runtime adapters must be supplied by Node Agent")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
