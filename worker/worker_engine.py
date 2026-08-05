"""Generic CWS render engine.

The engine is intentionally job-data driven. A Node Agent supplies one
authorized JobSpec per attempt; this module contains no customer/job IDs,
credentials, scheduler policy, or power-management behavior.

Adapters are injected so the control plane can be wired to the current
backend/B2 implementation without coupling the render process to secrets.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from enum import Enum
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


class FailureCategory(str, Enum):
    RETRYABLE = "retryable"
    PERMANENT = "permanent"


def classify_blender_failure(returncode: int | None, output: str) -> FailureCategory:
    """Classify observable Blender failure without pretending certainty.

    Missing/invalid project data is permanent for the same JobSpec. Timeout,
    resource pressure, driver and transport failures may be retried by the
    Backend policy on another attempt. Unknown failures remain retryable so a
    single node does not permanently poison a valid project.
    """
    text = output.lower()
    permanent_markers = ("cannot read file", "missing", "no such file", "invalid blend")
    if any(marker in text for marker in permanent_markers):
        return FailureCategory.PERMANENT
    return FailureCategory.RETRYABLE


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
        generation = int(value["lease_generation"])
        if generation < 0:
            raise PermanentWorkerError("invalid lease_generation")
        output_format = str(value["output_format"]).lstrip(".").lower()
        if not re.fullmatch(r"[a-z0-9]{1,8}", output_format):
            raise PermanentWorkerError("invalid output_format")
        if not str(value["project_uri"]).strip():
            raise PermanentWorkerError("project_uri is required")
        if bool(value.get("autoexec", False)):
            raise PermanentWorkerError("customer autoexec is disabled by policy")
        return cls(
            job_id=str(value["job_id"]),
            task_id=str(value["task_id"]),
            attempt_id=str(value["attempt_id"]),
            lease_generation=generation,
            project_uri=str(value["project_uri"]),
            frame_start=start,
            frame_end=end,
            output_prefix=str(value["output_prefix"]),
            output_format=output_format,
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


@dataclass(frozen=True)
class CheckpointRecord:
    job_id: str
    task_id: str
    frame: int
    bytes: int
    sha256: str
    attempt_id: str
    lease_generation: int


class FilesystemCheckpointStore:
    """Atomic, idempotent checkpoint reference implementation.

    This is a safe local staging adapter and model for the B2 adapter. It
    never treats object existence alone as success: the sidecar identity,
    byte count and SHA-256 must all match before a frame is resumed.
    """

    def __init__(self, root: Path):
        self.root = root.resolve()

    def _paths(self, spec: JobSpec, frame: int) -> tuple[Path, Path]:
        task_root = (self.root / spec.task_id).resolve()
        if not _inside(self.root, task_root):
            raise PermanentWorkerError("checkpoint path escaped root")
        return (task_root / f"frame_{frame:04d}.{spec.output_format}",
                task_root / f"frame_{frame:04d}.json")

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def _read_verified(self, spec: JobSpec, frame: int) -> bool:
        output, metadata = self._paths(spec, frame)
        try:
            record = json.loads(metadata.read_text(encoding="utf-8"))
            return (
                output.is_file()
                and record.get("job_id") == spec.job_id
                and record.get("task_id") == spec.task_id
                and int(record.get("frame")) == frame
                and int(record.get("bytes")) == output.stat().st_size
                and record.get("sha256") == self._sha256(output)
            )
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            return False

    def is_verified(self, spec: JobSpec, frame: int) -> bool:
        return self._read_verified(spec, frame)

    def put(self, spec: JobSpec, frame: int, output: Path) -> None:
        if self._read_verified(spec, frame):
            return
        destination, metadata = self._paths(spec, frame)
        destination.parent.mkdir(parents=True, exist_ok=True)
        digest = self._sha256(output)
        record = CheckpointRecord(spec.job_id, spec.task_id, frame,
                                  output.stat().st_size, digest,
                                  spec.attempt_id, spec.lease_generation)
        with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as temp:
            temp.write(output.read_bytes())
            temp_path = Path(temp.name)
        os.replace(temp_path, destination)
        with tempfile.NamedTemporaryFile(dir=metadata.parent, mode="w", encoding="utf-8", delete=False) as temp:
            json.dump(record.__dict__, temp, sort_keys=True)
            temp.write("\n")
            metadata_temp = Path(temp.name)
        os.replace(metadata_temp, metadata)

    def verify(self, spec: JobSpec, frame: int, output: Path) -> None:
        if not self._read_verified(spec, frame):
            raise RetryableWorkerError(f"checkpoint verification failed for frame {frame}")


class OutputValidator(Protocol):
    def validate(self, output: Path) -> None: ...


class AttemptGuard(Protocol):
    """Lease/fencing boundary supplied by the control plane adapter."""

    def heartbeat(self, spec: JobSpec, state: str) -> None: ...
    def assert_active(self, spec: JobSpec) -> None: ...


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


class OutputIntegrityValidator(BasicOutputValidator):
    """Validate output bytes without executing or fully decoding customer data.

    PNG renders get a lightweight structural check (signature + IHDR). Other
    formats retain the conservative size check until a format-specific
    validator is deliberately added. This keeps validation generic and avoids
    trusting a filename or a successful Blender exit code alone.
    """

    _PNG_SIGNATURE = b"\\x89PNG\\r\\n\\x1a\\n"

    def validate(self, output: Path) -> None:
        super().validate(output)
        if output.suffix.lower() != ".png":
            return
        try:
            with output.open("rb") as stream:
                signature = stream.read(8)
                length = int.from_bytes(stream.read(4), "big")
                chunk_type = stream.read(4)
                ihdr = stream.read(13) if length == 13 and chunk_type == b"IHDR" else b""
        except OSError as exc:
            raise RetryableWorkerError(f"cannot read render output: {output.name}") from exc
        if signature != self._PNG_SIGNATURE or len(ihdr) != 13:
            raise RetryableWorkerError(f"invalid PNG output: {output.name}")
        width = int.from_bytes(ihdr[0:4], "big")
        height = int.from_bytes(ihdr[4:8], "big")
        if width < 1 or height < 1:
            raise RetryableWorkerError(f"invalid PNG dimensions: {output.name}")


class BlenderCliRenderer:
    """Render one frame with customer auto-execution disabled."""

    def __init__(self, executable: Path, timeout_seconds: int = 3600):
        self.executable = executable.resolve()
        self.timeout_seconds = timeout_seconds

    @staticmethod
    def _terminate_tree(process: subprocess.Popen[str]) -> None:
        """Stop only the Blender process tree owned by this render attempt."""
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                           capture_output=True, text=True, check=False)
        else:
            process.kill()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=10)

    def render(self, spec: JobSpec, project: Path, frame: int, output: Path) -> Path:
        if not self.executable.is_file():
            raise RetryableWorkerError("Blender executable is unavailable")
        output.parent.mkdir(parents=True, exist_ok=True)
        pattern = str(output.parent / "frame_####")
        command = [str(self.executable), "--background", str(project),
                   "--disable-autoexec", "--python-exit-code", "1",
                   "--render-output", pattern, "--render-frame", str(frame)]
        creationflags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) if os.name == "nt" else 0
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                   text=True, creationflags=creationflags)
        try:
            stdout, stderr = process.communicate(timeout=self.timeout_seconds)
        except subprocess.TimeoutExpired as exc:
            self._terminate_tree(process)
            raise RetryableWorkerError("Blender render timed out") from exc
        result = subprocess.CompletedProcess(command, process.returncode, stdout, stderr)
        if result.returncode != 0:
            category = classify_blender_failure(result.returncode, f"{result.stdout}\n{result.stderr}")
            error = PermanentWorkerError if category is FailureCategory.PERMANENT else RetryableWorkerError
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
                 reporter: Reporter, guard: AttemptGuard | None = None):
        self.workspace_root = workspace_root.resolve()
        self.downloader = downloader
        self.preflight = preflight
        self.renderer = renderer
        self.checkpoints = checkpoints
        self.validator = validator
        self.reporter = reporter
        self.guard = guard

    def _guard(self, spec: JobSpec, state: str) -> None:
        if self.guard is None:
            return
        try:
            self.guard.assert_active(spec)
            self.guard.heartbeat(spec, state)
        except (PermanentWorkerError, RetryableWorkerError):
            raise
        except Exception as exc:
            raise RetryableWorkerError("lease/heartbeat adapter unavailable") from exc

    def run(self, spec: JobSpec) -> None:
        self.workspace_root.mkdir(parents=True, exist_ok=True)
        job_root = (self.workspace_root / spec.task_id).resolve()
        if not _inside(self.workspace_root, job_root):
            raise PermanentWorkerError("job workspace escaped workspace root")
        job_root.mkdir(parents=True, exist_ok=True)
        try:
            self._guard(spec, "CLAIMED")
            self.reporter.stage(spec, "DOWNLOADING")
            self._guard(spec, "DOWNLOADING")
            project = self.downloader.download(spec, job_root)
            project = project.resolve()
            if not _inside(job_root, project):
                raise PermanentWorkerError("downloaded project escaped job workspace")
            self.reporter.stage(spec, "PREFLIGHT")
            self.preflight.inspect(spec, project)
            self.reporter.stage(spec, "PREPARING")
            total = spec.frame_end - spec.frame_start + 1
            for frame in range(spec.frame_start, spec.frame_end + 1):
                self._guard(spec, "RENDERING")
                if self.checkpoints.is_verified(spec, frame):
                    self.reporter.progress(spec, frame, total)
                    continue
                self.reporter.stage(spec, "RENDERING")
                output = job_root / f"frame_{frame:04d}.{spec.output_format}"
                rendered = self.renderer.render(spec, project, frame, output)
                self.validator.validate(rendered)
                self.reporter.stage(spec, "UPLOADING")
                self.checkpoints.put(spec, frame, rendered)
                self.reporter.stage(spec, "VERIFYING")
                self.checkpoints.verify(spec, frame, rendered)
                self._guard(spec, "CHECKPOINTED")
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
