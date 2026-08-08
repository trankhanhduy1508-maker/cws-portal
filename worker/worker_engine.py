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
import threading
import tempfile
import zipfile
from enum import Enum
from dataclasses import dataclass
from pathlib import Path

from job_object import WindowsJobObject
from typing import Any, Mapping, Protocol, Sequence

from path_boundary import reject_reparse_points


_SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
_MAX_ARCHIVE_ENTRIES = 10_000
_MAX_ARCHIVE_UNCOMPRESSED_BYTES = 4 * 1024 * 1024 * 1024
_MAX_ARCHIVE_MEMBER_BYTES = 2 * 1024 * 1024 * 1024
_MAX_ARCHIVE_COMPRESSION_RATIO = 1_000


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
    required_vram_mb: int = 0
    required_ram_mb: int = 0

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
        output_prefix = str(value["output_prefix"]).strip().strip("/")
        if (
            not output_prefix
            or "\\" in output_prefix
            or "\x00" in output_prefix
            or any(part in {"", ".", ".."} for part in output_prefix.split("/"))
            or not re.fullmatch(r"[A-Za-z0-9._/-]{1,512}", output_prefix)
        ):
            raise PermanentWorkerError("invalid output_prefix")
        if bool(value.get("autoexec", False)):
            raise PermanentWorkerError("customer autoexec is disabled by policy")
        required_vram_mb = int(value.get("required_vram_mb", 0))
        required_ram_mb = int(value.get("required_ram_mb", 0))
        if required_vram_mb < 0 or required_ram_mb < 0:
            raise PermanentWorkerError("invalid capability requirement")
        return cls(
            job_id=str(value["job_id"]),
            task_id=str(value["task_id"]),
            attempt_id=str(value["attempt_id"]),
            lease_generation=generation,
            project_uri=str(value["project_uri"]),
            frame_start=start,
            frame_end=end,
            output_prefix=output_prefix,
            output_format=output_format,
            autoexec=False,
            required_vram_mb=required_vram_mb,
            required_ram_mb=required_ram_mb,
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


class BlendPreparer(Protocol):
    """Prepare an immutable customer project without mutating the source."""

    def prepare(self, project: Path, job_root: Path) -> Path: ...


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
        temp_path: Path | None = None
        metadata_temp: Path | None = None
        try:
            # Keep memory bounded for large render outputs.  The previous
            # read_bytes() implementation scaled worker RAM with frame size.
            with output.open("rb") as source, tempfile.NamedTemporaryFile(
                dir=destination.parent, delete=False
            ) as temp:
                shutil.copyfileobj(source, temp, length=1024 * 1024)
                temp.flush()
                os.fsync(temp.fileno())
                temp_path = Path(temp.name)
            os.replace(temp_path, destination)
            temp_path = None
            with tempfile.NamedTemporaryFile(
                dir=metadata.parent, mode="w", encoding="utf-8", delete=False
            ) as temp:
                json.dump(record.__dict__, temp, sort_keys=True)
                temp.write("\n")
                temp.flush()
                os.fsync(temp.fileno())
                metadata_temp = Path(temp.name)
            os.replace(metadata_temp, metadata)
            metadata_temp = None
        finally:
            if temp_path is not None:
                Path(temp_path).unlink(missing_ok=True)
            if metadata_temp is not None:
                Path(metadata_temp).unlink(missing_ok=True)

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


def _safe_archive_member(name: str) -> Path:
    """Convert an archive member to a safe relative path."""
    normalized = name.replace('\\', '/').rstrip('/')
    if (
        not normalized
        or '\x00' in normalized
        or normalized.startswith('/')
        or re.match(r'^[A-Za-z]:($|/)', normalized)
    ):
        raise PermanentWorkerError('archive contains an unsafe path')
    parts = normalized.split('/')
    if any(part in ('', '.', '..') or ':' in part for part in parts):
        raise PermanentWorkerError('archive contains a path traversal entry')
    return Path(*parts)


def resolve_project_input(spec: JobSpec, downloaded: Path, job_root: Path) -> Path:
    """Use a .blend directly or safely extract exactly one .blend from an archive."""
    if downloaded.suffix.lower() == '.blend':
        return downloaded
    if downloaded.suffix.lower() == '.rar':
        return _extract_rar(downloaded, job_root)
    if downloaded.suffix.lower() != '.zip':
        raise PermanentWorkerError('input must be a .blend file or .zip/.rar archive')

    extraction_root = (job_root / 'project_archive').resolve()
    if not _inside(job_root, extraction_root):
        raise PermanentWorkerError('archive extraction escaped job workspace')
    extraction_root.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    total_bytes = 0
    try:
        with zipfile.ZipFile(downloaded) as archive:
            infos = archive.infolist()
            if len(infos) > _MAX_ARCHIVE_ENTRIES:
                raise PermanentWorkerError('archive contains too many entries')
            for info in infos:
                relative = _safe_archive_member(info.filename)
                key = relative.as_posix().lower()
                if key in seen:
                    raise PermanentWorkerError('archive contains duplicate paths')
                seen.add(key)
                mode = (info.external_attr >> 16) & 0o170000
                if mode == 0o120000:
                    raise PermanentWorkerError('archive symlinks are not allowed')
                if info.is_dir():
                    (extraction_root / relative).mkdir(parents=True, exist_ok=True)
                    continue
                if info.file_size < 0 or info.file_size > _MAX_ARCHIVE_MEMBER_BYTES:
                    raise PermanentWorkerError('archive member is too large')
                compressed = info.compress_size
                if info.file_size > 1024 * 1024 and (
                    compressed == 0
                    or info.file_size / compressed > _MAX_ARCHIVE_COMPRESSION_RATIO
                ):
                    raise PermanentWorkerError('archive compression ratio is unsafe')
                if total_bytes + info.file_size > _MAX_ARCHIVE_UNCOMPRESSED_BYTES:
                    raise PermanentWorkerError('archive expands beyond the safety limit')
                target = (extraction_root / relative).resolve()
                if not _inside(extraction_root, target):
                    raise PermanentWorkerError('archive path escaped extraction root')
                target.parent.mkdir(parents=True, exist_ok=True)
                written = 0
                with archive.open(info, 'r') as source, target.open('xb') as output:
                    while True:
                        chunk = source.read(1024 * 1024)
                        if not chunk:
                            break
                        written += len(chunk)
                        if written > _MAX_ARCHIVE_MEMBER_BYTES:
                            raise PermanentWorkerError('archive member expanded beyond the safety limit')
                        output.write(chunk)
                total_bytes += written
    except zipfile.BadZipFile as exc:
        raise PermanentWorkerError('input is not a valid ZIP archive') from exc

    blend_files = [
        path
        for path in extraction_root.rglob('*')
        if path.is_file() and path.suffix.lower() == '.blend'
    ]
    if len(blend_files) != 1:
        raise PermanentWorkerError(
            f'ZIP must contain exactly one .blend file (found {len(blend_files)})'
        )
    return blend_files[0]


def _parse_rar_listing(output: str) -> dict[str, int]:
    """Return normalized file members and declared unpacked sizes."""
    records: list[dict[str, str]] = []
    current: dict[str, str] = {}
    for line in output.splitlines():
        if not line.strip():
            if current:
                records.append(current)
                current = {}
            continue
        key, separator, value = line.partition(' = ')
        if separator:
            current[key] = value
    if current:
        records.append(current)
    members = [record for record in records if record.get('Type', '').lower() not in {'rar', 'rar5'}]
    if not members or len(members) > _MAX_ARCHIVE_ENTRIES:
        raise PermanentWorkerError('RAR has an invalid number of entries')
    seen: set[str] = set()
    declared_total = 0
    declared_files: dict[str, int] = {}
    for record in members:
        name = record.get('Path', '')
        relative = _safe_archive_member(name)
        normalized = relative.as_posix().lower()
        if normalized in seen:
            raise PermanentWorkerError('RAR contains duplicate paths')
        seen.add(normalized)
        entry_type = record.get('Type', '').lower()
        attributes = record.get('Attributes', '')
        if entry_type in {'link', 'symlink', 'hardlink'} or 'l' in attributes.lower():
            raise PermanentWorkerError('RAR links are not allowed')
        if relative.suffix.lower() in {'.rar', '.zip'}:
            raise PermanentWorkerError('nested archives are not allowed')
        if entry_type in {'d', 'folder', 'directory'} or name.endswith(('\\', '/')):
            continue
        try:
            size = int(record.get('Size', ''))
            packed = int(record.get('Packed Size', ''))
        except ValueError as exc:
            raise PermanentWorkerError('RAR member size metadata is invalid') from exc
        if size < 0 or packed < 0 or size > _MAX_ARCHIVE_MEMBER_BYTES:
            raise PermanentWorkerError('RAR member is too large')
        if size > 1024 * 1024 and (packed == 0 or size / packed > _MAX_ARCHIVE_COMPRESSION_RATIO):
            raise PermanentWorkerError('RAR compression ratio is unsafe')
        declared_total += size
        if declared_total > _MAX_ARCHIVE_UNCOMPRESSED_BYTES:
            raise PermanentWorkerError('RAR expands beyond the safety limit')
        declared_files[normalized] = size
    return declared_files


def _extract_rar(downloaded: Path, job_root: Path) -> Path:
    """RAR extraction via managed 7-Zip with declared-size bomb limits.

    7-Zip is invoked with an argument vector (never a shell).  The listing is
    inspected before extraction so an archive cannot claim a small compressed
    size while expanding past the same bounded limits used by ZIP.  A second
    filesystem walk verifies that the extractor did not create links, reparse
    points, unexpected paths or more bytes than were declared.
    """
    extractor = shutil.which('7z.exe') or shutil.which('7z')
    if not extractor:
        raise PermanentWorkerError('RAR input requires the managed 7-Zip runtime')
    extraction_root = (job_root / 'project_archive').resolve()
    if not _inside(job_root, extraction_root):
        raise PermanentWorkerError('archive extraction escaped job workspace')
    try:
        listing = subprocess.run(
            [extractor, 'l', '-slt', '-bd', str(downloaded)], capture_output=True, text=True,
            timeout=60, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RetryableWorkerError('RAR inspection failed') from exc
    if listing.returncode != 0:
        raise PermanentWorkerError('input is not a valid RAR archive')

    declared_files = _parse_rar_listing(listing.stdout)

    extraction_root.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [extractor, 'x', '-y', '-bd', '-spf-', '-snl-', '-sni-', f'-o{extraction_root}', str(downloaded)],
        capture_output=True, text=True, timeout=15 * 60, check=False,
    )
    if result.returncode != 0:
        raise PermanentWorkerError('RAR extraction failed')
    reject_reparse_points(extraction_root)
    actual_files = [path for path in extraction_root.rglob('*') if path.is_file()]
    actual_total = 0
    actual_names: set[str] = set()
    for path in actual_files:
        relative = _safe_archive_member(path.relative_to(extraction_root).as_posix())
        normalized = relative.as_posix().lower()
        if normalized not in declared_files:
            raise PermanentWorkerError('RAR extraction created an unexpected file')
        if path.is_symlink():
            raise PermanentWorkerError('RAR extraction created a symlink')
        size = path.stat().st_size
        if size != declared_files[normalized]:
            raise PermanentWorkerError('RAR extracted size does not match archive metadata')
        actual_names.add(normalized)
        actual_total += size
    if actual_total > _MAX_ARCHIVE_UNCOMPRESSED_BYTES or actual_names != set(declared_files):
        raise PermanentWorkerError('RAR extracted content exceeded the safety contract')
    blends = [p for p in extraction_root.rglob('*') if p.is_file() and p.suffix.lower() == '.blend']
    if len(blends) != 1:
        raise PermanentWorkerError(f'RAR must contain exactly one .blend file (found {len(blends)})')
    return blends[0]


class BasicPreflight:
    """Safe filesystem-only preflight; it never executes customer code."""

    def __init__(self, capabilities: Mapping[str, Any] | None = None):
        self.capabilities = capabilities or {}

    def inspect(self, spec: JobSpec, project: Path) -> None:
        if project.suffix.lower() != ".blend" or not project.is_file():
            raise PermanentWorkerError("project is not a readable .blend file")
        available_vram = int(self.capabilities.get("vram_mb", 0))
        available_ram = int(self.capabilities.get("ram_mb", 0))
        if spec.required_vram_mb and available_vram < spec.required_vram_mb:
            raise PermanentWorkerError("node VRAM capability is insufficient")
        if spec.required_ram_mb and available_ram < spec.required_ram_mb:
            raise PermanentWorkerError("node RAM capability is insufficient")


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

    _PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

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


class BlenderSafePreparer:
    """Analyzer -> working copy -> policy optimizer -> validation pipeline.

    The downloaded project is treated as immutable input.  The only Blender
    file ever passed to the render loop is the validated working copy.  The
    helper scripts are shipped with CWS and are invoked with auto-execution
    disabled, so customer-provided Python in a .blend is never enabled.
    """

    _PROTECTED_ANALYSIS_FIELDS = (
        "render_engine", "resolution", "objects", "meshes", "mesh_vertices",
        "mesh_polygons", "lights", "cameras", "textures", "texture_estimated_bytes",
        "missing_assets", "subdivision", "volume_nodes",
    )
    _PROTECTED_CYCLES_FIELDS = (
        "samples", "use_denoising", "use_adaptive_sampling", "adaptive_threshold",
        "max_bounces", "diffuse_bounces", "glossy_bounces", "transmission_bounces",
        "volume_bounces", "transparent_bounces",
    )

    def __init__(self, blender_exe: Path, analyzer_script: Path, timeout_seconds: int = 300):
        self.blender_exe = blender_exe.resolve()
        self.analyzer_script = analyzer_script.resolve()
        self.timeout_seconds = timeout_seconds

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def _analyze(self, project: Path, report: Path) -> dict[str, Any]:
        env = os.environ.copy()
        env["CWS_ANALYZER_OUTPUT"] = str(report)
        command = [
            str(self.blender_exe), "--background", "--disable-autoexec",
            "--python-exit-code", "1", str(project), "--python", str(self.analyzer_script),
        ]
        try:
            result = subprocess.run(
                command, capture_output=True, text=True, timeout=self.timeout_seconds,
                env=env, cwd=str(report.parent), check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise RetryableWorkerError("Blender optimization analysis failed") from exc
        if result.returncode != 0 or not report.is_file():
            raise RetryableWorkerError("Blender optimization analyzer failed")
        try:
            return json.loads(report.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RetryableWorkerError("Blender optimization analysis was invalid") from exc

    @classmethod
    def _protected_projection(cls, analysis: Mapping[str, Any]) -> dict[str, Any]:
        projection = {key: analysis.get(key) for key in cls._PROTECTED_ANALYSIS_FIELDS}
        cycles = analysis.get("cycles")
        if isinstance(cycles, Mapping):
            projection["cycles"] = {key: cycles.get(key) for key in cls._PROTECTED_CYCLES_FIELDS}
        else:
            projection["cycles"] = cycles
        return projection

    def prepare(self, project: Path, job_root: Path) -> Path:
        if not project.is_file() or project.suffix.lower() != ".blend":
            raise PermanentWorkerError("safe optimization requires a .blend project")
        original_digest = self._sha256(project)
        original_report = job_root / "optimization_original.json"
        original_analysis = self._analyze(project, original_report)
        if self._sha256(project) != original_digest:
            raise PermanentWorkerError("customer .blend changed during analysis")

        working_dir = (job_root / "working_copy").resolve()
        if not _inside(job_root, working_dir):
            raise PermanentWorkerError("working copy escaped job workspace")
        working_dir.mkdir(parents=True, exist_ok=True)
        working_copy = working_dir / "project.blend"
        try:
            from blender_optimizer import run as run_safe_optimizer
            plan_path = run_safe_optimizer(self.blender_exe, project, working_copy, apply=True)
        except (OSError, subprocess.TimeoutExpired, RuntimeError, ValueError) as exc:
            raise RetryableWorkerError("safe Blender optimizer failed") from exc
        if not working_copy.is_file() or not plan_path.is_file():
            raise RetryableWorkerError("safe optimizer did not produce a working copy")
        try:
            plan = json.loads(plan_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RetryableWorkerError("safe optimizer plan was invalid") from exc
        if plan.get("schema_version") != "cws.optimization-plan.v1" or plan.get("applied") is not True:
            raise PermanentWorkerError("safe optimizer plan failed validation")

        working_report = job_root / "optimization_working.json"
        working_analysis = self._analyze(working_copy, working_report)
        if self._protected_projection(original_analysis) != self._protected_projection(working_analysis):
            raise PermanentWorkerError("optimizer changed a protected render-quality setting")
        if self._sha256(project) != original_digest:
            raise PermanentWorkerError("customer .blend was modified by safe optimization")
        return working_copy


class BlenderCliRenderer:
    """Render one frame with customer auto-execution disabled."""

    def __init__(self, executable: Path, timeout_seconds: int = 3600,
                 use_job_object: bool = False, metrics_callback=None,
                 metrics_interval_seconds: float = 5.0):
        self.executable = executable.resolve()
        self.timeout_seconds = timeout_seconds
        self.use_job_object = use_job_object
        self.metrics_callback = metrics_callback
        self.metrics_interval_seconds = metrics_interval_seconds

    @staticmethod
    def _terminate_tree(process: subprocess.Popen[str]) -> None:
        """Stop only the Blender process tree owned by this render attempt."""
        if os.name == "nt":
            try:
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                               capture_output=True, text=True, check=False, timeout=10)
            except subprocess.TimeoutExpired:
                pass
            # taskkill is best-effort; never leave the owned direct child alive.
            process.kill()
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
        stop_metrics = threading.Event()
        metrics_thread = None
        if self.metrics_callback is not None:
            from host_metrics import collect_host_metrics

            def sample() -> None:
                while not stop_metrics.wait(self.metrics_interval_seconds):
                    try:
                        self.metrics_callback(collect_host_metrics(process.pid))
                    except Exception:
                        pass

            metrics_thread = threading.Thread(target=sample, name="cws-render-metrics", daemon=True)
            metrics_thread.start()
        job_object = None
        try:
            if self.use_job_object:
                job_object = WindowsJobObject()
                job_object.assign(process)
            stdout, stderr = process.communicate(timeout=self.timeout_seconds)
        except subprocess.TimeoutExpired as exc:
            self._terminate_tree(process)
            raise RetryableWorkerError("Blender render timed out") from exc
        except Exception as exc:
            self._terminate_tree(process)
            raise RetryableWorkerError("could not attach Blender process to Job Object") from exc
        finally:
            stop_metrics.set()
            if metrics_thread is not None:
                metrics_thread.join(timeout=2)
            if job_object is not None:
                job_object.close()
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
                 reporter: Reporter, guard: AttemptGuard | None = None,
                 preparer: BlendPreparer | None = None):
        self.workspace_root = workspace_root.resolve()
        self.downloader = downloader
        self.preflight = preflight
        self.renderer = renderer
        self.checkpoints = checkpoints
        self.validator = validator
        self.reporter = reporter
        self.guard = guard
        self.preparer = preparer

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
        try:
            reject_reparse_points(self.workspace_root, self.workspace_root / spec.task_id)
        except ValueError as exc:
            raise PermanentWorkerError("job workspace contains a reparse point") from exc
        job_root.mkdir(parents=True, exist_ok=True)
        try:
            self._guard(spec, "CLAIMED")
            self.reporter.stage(spec, "DOWNLOADING")
            self._guard(spec, "DOWNLOADING")
            project = self.downloader.download(spec, job_root)
            project = project.resolve()
            if not _inside(job_root, project):
                raise PermanentWorkerError("downloaded project escaped job workspace")
            project = resolve_project_input(spec, project, job_root).resolve()
            if not _inside(job_root, project):
                raise PermanentWorkerError("resolved project escaped job workspace")
            self.reporter.stage(spec, "PREFLIGHT")
            self.preflight.inspect(spec, project)
            self.reporter.stage(spec, "PREPARING")
            if self.preparer is not None:
                self.reporter.stage(spec, "OPTIMIZING")
                project = self.preparer.prepare(project, job_root).resolve()
                if not _inside(job_root, project):
                    raise PermanentWorkerError("optimized project escaped job workspace")
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
                # Fence immediately before the side effect.  A stale attempt
                # must not upload a newly rendered frame after reassignment.
                self._guard(spec, "UPLOADING")
                self.checkpoints.put(spec, frame, rendered)
                self.reporter.stage(spec, "VERIFYING")
                self.checkpoints.verify(spec, frame, rendered)
                self._guard(spec, "CHECKPOINTED")
                self.reporter.progress(spec, frame, total)
            # Fencing is required immediately before the final state change as
            # well as before every output side effect. A stale attempt must
            # never finalize a task after reassignment.
            self._guard(spec, "COMPLETING")
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
