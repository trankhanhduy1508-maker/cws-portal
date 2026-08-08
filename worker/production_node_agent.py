"""Production Node Agent loop for the canonical generic CWS Worker.

This module is deliberately credential-gated and has no local/mock fallback.
It pulls a fenced assignment through the authenticated backend RPC gateway,
resolves the dynamic JobSpec, downloads the project from Google Drive or B2,
executes ``worker_engine.py`` with real adapters, and reports progress/output
back through the same authenticated gateway.

The module is safe to import and unit-test without Windows, Blender or cloud
credentials. Running it requires a Windows DPAPI credential store and explicit
production configuration.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import http.client
import json
import logging
import os
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

# Support direct execution by the Windows launcher even when the bundled
# Python runtime runs in isolated mode and omits PYTHONPATH.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from node_agent import Job, NodeAgent, WorkerResult
from node_agent import NodeState
from node_agent_runtime_policy import RuntimePolicy
from worker_engine import (
    AttemptGuard,
    BasicPreflight,
    BlenderCliRenderer,
    CheckpointStore,
    JobSpec,
    OutputIntegrityValidator,
    PermanentWorkerError,
    ProjectDownloader,
    Reporter,
    RetryableWorkerError,
    WorkerEngine,
)
from blender_bootstrap import resolve_blender
from worker_rpc_auth import WorkerCredential, WorkerRpcClient
from windows_credential_store import WindowsProtectedCredentialStore


_SAFE_ID = re.compile(r"^[A-Za-z0-9._~-]{1,128}$")
_DRIVE_FILE_ID = re.compile(r"/file/d/([A-Za-z0-9_-]+)")
_DRIVE_QUERY_ID = re.compile(r"(?:^|&)id=([A-Za-z0-9_-]+)(?:&|$)")
_LOGGER = logging.getLogger("cws.production_node_agent")

_OBSERVED_STATES = {
    NodeState.ACTIVE_IDLE.value: "ACTIVE_IDLE",
    NodeState.PREPARING.value: "PREPARING",
    NodeState.WORKER_START.value: "PREPARING",
    NodeState.WORKER_RUNNING.value: "RENDERING",
    NodeState.RECOVERY.value: "RECOVERY",
    NodeState.CLEANUP.value: "CLEANUP",
}


@dataclass(frozen=True)
class ProductionConfig:
    backend_url: str
    worker_id: str
    credential_file: Path
    blender_exe: Path | None
    blender_cache_dir: Path
    blender_download_url: str | None
    blender_sha256: str | None
    workspace: Path
    google_drive_api_key: str | None
    worker_vram_mb: int
    worker_ram_mb: int
    poll_seconds: float
    heartbeat_seconds: float
    render_timeout_seconds: int

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "ProductionConfig":
        values = env or os.environ

        def required(name: str) -> str:
            value = values.get(name, "").strip()
            if not value:
                raise PermanentWorkerError(f"missing production configuration: {name}")
            return value

        backend_url = required("CWS_BACKEND_URL").rstrip("/")
        if not backend_url.startswith("https://"):
            raise PermanentWorkerError("CWS_BACKEND_URL must use https://")
        worker_id = required("CWS_WORKER_ID")
        if not _SAFE_ID.fullmatch(worker_id):
            raise PermanentWorkerError("invalid CWS_WORKER_ID")
        def integer(name: str, default: int) -> int:
            raw = values.get(name, str(default)).strip()
            try:
                result = int(raw)
            except ValueError as exc:
                raise PermanentWorkerError(f"{name} must be an integer") from exc
            if result < 0:
                raise PermanentWorkerError(f"{name} must be non-negative")
            return result

        def positive_integer(name: str, default: int) -> int:
            result = integer(name, default)
            if result <= 0:
                raise PermanentWorkerError(f"{name} must be positive")
            return result

        def positive_float(name: str, default: float) -> float:
            raw = values.get(name, str(default)).strip()
            try:
                result = float(raw)
            except ValueError as exc:
                raise PermanentWorkerError(f"{name} must be a number") from exc
            if result <= 0:
                raise PermanentWorkerError(f"{name} must be positive")
            return result

        workspace = Path(required("CWS_WORKSPACE"))
        explicit_blender = values.get("CWS_BLENDER_EXE", "").strip()
        return cls(
            backend_url=backend_url,
            worker_id=worker_id,
            credential_file=Path(required("CWS_WORKER_CREDENTIAL_FILE")),
            blender_exe=Path(explicit_blender) if explicit_blender else None,
            blender_cache_dir=Path(
                values.get("CWS_BLENDER_CACHE_DIR", str(workspace / "Blender"))
            ),
            blender_download_url=values.get("CWS_BLENDER_DOWNLOAD_URL", "").strip() or None,
            blender_sha256=values.get("CWS_BLENDER_SHA256", "").strip() or None,
            workspace=workspace,
            # Drive is optional. B2-backed JobSpecs must not need a Google API
            # key; the downloader fails closed only if a Drive URI is claimed.
            google_drive_api_key=values.get("CWS_GOOGLE_DRIVE_API_KEY", "").strip() or None,
            worker_vram_mb=integer("CWS_WORKER_VRAM_MB", 0),
            worker_ram_mb=integer("CWS_WORKER_RAM_MB", 0),
            poll_seconds=positive_float("CWS_WORKER_POLL_SECONDS", 5.0),
            heartbeat_seconds=positive_float("CWS_WORKER_HEARTBEAT_SECONDS", 20.0),
            render_timeout_seconds=positive_integer("CWS_RENDER_TIMEOUT_SECONDS", 3600),
        )


def _single_assignment(value: Any) -> Mapping[str, Any] | None:
    if value is None or value == [] or value == [None]:
        return None
    if isinstance(value, list):
        if len(value) != 1 or not isinstance(value[0], Mapping):
            raise PermanentWorkerError("claim RPC returned an invalid assignment")
        return value[0]
    if not isinstance(value, Mapping):
        raise PermanentWorkerError("claim RPC returned an invalid assignment")
    return value


def _capability_url(capability: Mapping[str, Any], method: str) -> str:
    if capability.get("method") != method:
        raise PermanentWorkerError("storage capability method mismatch")
    url = capability.get("url")
    expires = capability.get("expires_in_seconds")
    if not isinstance(url, str) or not isinstance(expires, int) or not 1 <= expires <= 300:
        raise PermanentWorkerError("invalid storage capability")
    parsed = urllib.parse.urlparse(url)
    hostname = (parsed.hostname or "").lower()
    if (
        parsed.scheme != "https"
        or not hostname.endswith(".backblazeb2.com")
        or parsed.username is not None
        or parsed.password is not None
    ):
        raise PermanentWorkerError("storage capability host is not allowed")
    return url


def _capability_headers(capability: Mapping[str, Any]) -> dict[str, str]:
    value = capability.get("headers", {})
    if not isinstance(value, Mapping):
        raise PermanentWorkerError("invalid storage capability headers")
    headers: dict[str, str] = {}
    for raw_name, raw_value in value.items():
        name = str(raw_name).lower()
        if name not in {"content-type", "content-length"} and not name.startswith(
            "x-amz-meta-"
        ):
            raise PermanentWorkerError("storage capability contains an unsafe header")
        if "\r" in str(raw_value) or "\n" in str(raw_value):
            raise PermanentWorkerError("storage capability contains an unsafe header")
        headers[name] = str(raw_value)
    return headers


def _download_capability(
    capability: Mapping[str, Any], destination: Path, *, max_bytes: int
) -> None:
    url = _capability_url(capability, "GET")
    request = urllib.request.Request(
        url, method="GET", headers=_capability_headers(capability)
    )
    total = 0
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(request, timeout=120) as response, destination.open(
        "wb"
    ) as stream:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                raise PermanentWorkerError("storage download exceeds safety limit")
            stream.write(chunk)


def _upload_capability(capability: Mapping[str, Any], source: Path) -> None:
    url = _capability_url(capability, "PUT")
    headers = _capability_headers(capability)
    size = source.stat().st_size
    if headers.get("content-length") != str(size):
        raise PermanentWorkerError("storage capability content length mismatch")
    parsed = urllib.parse.urlparse(url)
    connection = http.client.HTTPSConnection(parsed.hostname, parsed.port or 443, timeout=120)
    try:
        with source.open("rb") as stream:
            connection.request(
                "PUT",
                urllib.parse.urlunparse(("", "", parsed.path, parsed.params, parsed.query, "")),
                body=stream,
                headers=headers,
            )
            response = connection.getresponse()
            response.read()
            if response.status < 200 or response.status >= 300:
                raise RetryableWorkerError(
                    f"storage upload rejected with HTTP {response.status}"
                )
    finally:
        connection.close()


class ProductionRpcAdapter:
    def __init__(self, client: WorkerRpcClient, config: ProductionConfig):
        self.client = client
        self.config = config

    def worker_ping(self) -> None:
        self.client.call("worker_ping", {})

    def transition(self, state: str, task_id: int | None = None, reason: str | None = None) -> None:
        observed = _OBSERVED_STATES.get(state, state)
        if observed not in {"ACTIVE_IDLE", "PREPARING", "RENDERING", "RECOVERY", "CLEANUP"}:
            raise PermanentWorkerError("invalid Worker observed state")
        payload: dict[str, Any] = {"p_to_state": observed}
        if task_id is not None:
            payload["p_task_id"] = int(task_id)
        if reason:
            payload["p_reason"] = reason[:240]
        result = self.client.call("report_worker_state_transition", payload)
        if result is not True:
            raise RetryableWorkerError("Worker state transition was rejected")

    def claim(self) -> JobSpec | None:
        claimed = _single_assignment(
            self.client.call(
                "claim_next_resilient_task",
                {"p_worker_vram_mb": self.config.worker_vram_mb},
            )
        )
        if claimed is None:
            return None
        task_id = int(claimed["task_id"])
        generation = int(claimed["lease_generation"])
        spec_value = _single_assignment(
            self.client.call(
                "get_claimed_task_spec",
                {"p_task_id": task_id, "p_generation": generation},
            )
        )
        if spec_value is None:
            raise RetryableWorkerError("claimed task has no current JobSpec")
        return JobSpec.from_mapping(spec_value)

    def heartbeat(self, spec: JobSpec) -> None:
        result = self.client.call(
            "report_heartbeat",
            {"p_task_id": int(spec.task_id), "p_generation": spec.lease_generation},
        )
        if result is not True:
            raise PermanentWorkerError("Worker lease is no longer active")

    def update_stage(self, spec: JobSpec, stage: str, frame: int | None = None) -> None:
        payload: dict[str, Any] = {
            "p_task_id": int(spec.task_id),
            "p_generation": spec.lease_generation,
            "p_stage": stage[:80],
        }
        if frame is not None:
            payload["p_frame_num"] = frame
        result = self.client.call("update_task_stage", payload)
        if result is not True:
            raise PermanentWorkerError("stale Worker attempt rejected")

    def complete(self, spec: JobSpec) -> None:
        result = self.client.call(
            "complete_task",
            {"p_task_id": int(spec.task_id), "p_generation": spec.lease_generation},
        )
        if result is not True:
            raise PermanentWorkerError("stale or duplicate completion rejected")

    def fail(self, spec: JobSpec, error_type: str) -> None:
        self.client.call(
            "fail_task",
            {
                "p_task_id": int(spec.task_id),
                "p_generation": spec.lease_generation,
                "p_error_type": error_type,
            },
        )

    def storage_capability(
        self,
        action: str,
        spec: JobSpec,
        *,
        frame: int | None = None,
        size: int | None = None,
        sha256: str | None = None,
    ) -> Mapping[str, Any]:
        payload: dict[str, Any] = {
            "action": action,
            "task_id": int(spec.task_id),
            "generation": spec.lease_generation,
        }
        if frame is not None:
            payload["frame"] = frame
        if size is not None:
            payload["bytes"] = size
        if sha256 is not None:
            payload["sha256"] = sha256
        result = self.client.call_path("/worker/storage-capability", payload)
        if not isinstance(result, Mapping):
            raise RetryableWorkerError("invalid storage capability response")
        return result


class DriveOrB2Downloader(ProjectDownloader):
    def __init__(self, config: ProductionConfig, rpc: ProductionRpcAdapter):
        self.config = config
        self.rpc = rpc

    @staticmethod
    def _drive_id(uri: str) -> str | None:
        parsed = urllib.parse.urlparse(uri)
        if parsed.scheme != "https":
            return None
        match = _DRIVE_FILE_ID.search(parsed.path)
        if match:
            return match.group(1)
        query = _DRIVE_QUERY_ID.search(parsed.query)
        return query.group(1) if query else None

    @staticmethod
    def _validate_downloaded_file(path: Path) -> None:
        """Reject HTML/error payloads before Blender or archive handling."""
        suffix = path.suffix.lower()
        try:
            with path.open("rb") as stream:
                prefix = stream.read(8)
            if suffix == ".blend":
                if prefix.startswith(b"BLENDER"):
                    return
                if prefix[:2] == b"\x1f\x8b":
                    with gzip.open(path, "rb") as compressed:
                        if compressed.read(7) == b"BLENDER":
                            return
                raise PermanentWorkerError("downloaded .blend is not a Blender file")
            if suffix == ".zip" and prefix[:4] == b"PK\x03\x04":
                return
            raise PermanentWorkerError("downloaded project has an invalid file signature")
        except (OSError, EOFError, gzip.BadGzipFile) as exc:
            raise PermanentWorkerError("downloaded project could not be validated") from exc

    def _download_http(self, uri: str, destination: Path) -> Path:
        drive_id = self._drive_id(uri)
        if drive_id:
            if not self.config.google_drive_api_key:
                raise PermanentWorkerError(
                    "CWS_GOOGLE_DRIVE_API_KEY is required for Google Drive input"
                )
            uri = (
                "https://www.googleapis.com/drive/v3/files/"
                + urllib.parse.quote(drive_id, safe="")
                + "?alt=media&key="
                + urllib.parse.quote(self.config.google_drive_api_key, safe="")
            )
        parsed = urllib.parse.urlparse(uri)
        if parsed.scheme != "https" or parsed.hostname not in {
            "drive.google.com",
            "www.googleapis.com",
        }:
            raise PermanentWorkerError("project URI must use HTTPS or b2://")
        if parsed.hostname == "drive.google.com" and not drive_id:
            raise PermanentWorkerError("Google Drive URI is not a file link")
        if parsed.hostname == "www.googleapis.com" and not self.config.google_drive_api_key:
            raise PermanentWorkerError(
                "CWS_GOOGLE_DRIVE_API_KEY is required for Google Drive input"
            )
        destination.parent.mkdir(parents=True, exist_ok=True)
        target = destination / "input.download"
        partial = target.with_suffix(target.suffix + ".part")
        try:
            with urllib.request.urlopen(uri, timeout=60) as response, partial.open("wb") as stream:
                total = 0
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > 20 * 1024 * 1024 * 1024:
                        raise PermanentWorkerError("input exceeds 20 GiB safety limit")
                    stream.write(chunk)
            partial.replace(target)
            detected = self._detect_download_suffix(target)
            final_target = destination / f"input{detected}"
            target.replace(final_target)
            self._validate_downloaded_file(final_target)
            return final_target
        except PermanentWorkerError:
            partial.unlink(missing_ok=True)
            target.unlink(missing_ok=True)
            for candidate in (destination / "input.blend", destination / "input.zip"):
                candidate.unlink(missing_ok=True)
            raise
        except (OSError, urllib.error.URLError, urllib.error.HTTPError) as exc:
            partial.unlink(missing_ok=True)
            target.unlink(missing_ok=True)
            raise RetryableWorkerError("project download failed") from exc

    @staticmethod
    def _detect_download_suffix(path: Path) -> str:
        try:
            with path.open("rb") as stream:
                prefix = stream.read(8)
        except OSError as exc:
            raise PermanentWorkerError("downloaded project could not be read") from exc
        if prefix.startswith(b"BLENDER") or prefix[:2] == b"\x1f\x8b":
            return ".blend"
        if prefix[:4] == b"PK\x03\x04":
            return ".zip"
        raise PermanentWorkerError("downloaded project has an invalid file signature")

    def _download_b2(self, spec: JobSpec, destination: Path) -> Path:
        uri = spec.project_uri
        parsed = urllib.parse.urlparse(uri)
        key = parsed.path.lstrip("/")
        if parsed.scheme != "b2" or not key or ".." in key.split("/"):
            raise PermanentWorkerError("invalid B2 project URI")
        suffix = Path(key).suffix.lower()
        if suffix not in {".blend", ".zip"}:
            raise PermanentWorkerError("B2 input must be .blend or .zip")
        target = destination / f"input{suffix}"
        target.parent.mkdir(parents=True, exist_ok=True)
        partial = target.with_suffix(target.suffix + ".part")
        try:
            capability = self.rpc.storage_capability("input_download", spec)
            _download_capability(capability, partial, max_bytes=20 * 1024 * 1024 * 1024)
            partial.replace(target)
            self._validate_downloaded_file(target)
            return target
        except PermanentWorkerError:
            partial.unlink(missing_ok=True)
            target.unlink(missing_ok=True)
            raise
        except Exception as exc:
            partial.unlink(missing_ok=True)
            target.unlink(missing_ok=True)
            raise RetryableWorkerError("B2 project download failed") from exc

    def download(self, spec: JobSpec, destination: Path) -> Path:
        if spec.project_uri.startswith("b2://"):
            return self._download_b2(spec, destination)
        return self._download_http(spec.project_uri, destination)


class BlenderScenePreflight:
    """Read-only Blender inspection that rejects missing linked assets."""

    def __init__(self, blender_exe: Path, analyzer_script: Path, capabilities: Mapping[str, Any]):
        self.blender_exe = blender_exe
        self.analyzer_script = analyzer_script
        self.basic = BasicPreflight(capabilities)

    def inspect(self, spec: JobSpec, project: Path) -> None:
        self.basic.inspect(spec, project)
        report = project.parent / "scene-analysis.json"
        env = os.environ.copy()
        env["CWS_ANALYZER_OUTPUT"] = str(report)
        command = [
            str(self.blender_exe),
            "--background",
            "--disable-autoexec",
            str(project),
            "--python",
            str(self.analyzer_script),
        ]
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=300,
                env=env,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise RetryableWorkerError("Blender scene preflight failed") from exc
        if result.returncode != 0 or not report.is_file():
            raise RetryableWorkerError("Blender scene analyzer failed")
        try:
            analysis = json.loads(report.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RetryableWorkerError("Blender scene analysis was invalid") from exc
        finally:
            report.unlink(missing_ok=True)
        missing = analysis.get("missing_assets", [])
        if missing:
            raise PermanentWorkerError(
                f"scene has {len(missing)} missing linked asset(s)"
            )


class ProductionB2CheckpointStore(CheckpointStore):
    def __init__(self, rpc: ProductionRpcAdapter):
        self.rpc = rpc

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def _remote_digest(self, capability: Mapping[str, Any]) -> tuple[int, str]:
        digest = hashlib.sha256()
        size = 0
        try:
            url = _capability_url(capability, "GET")
            with urllib.request.urlopen(url, timeout=120) as response:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    size += len(chunk)
                    digest.update(chunk)
            return size, digest.hexdigest()
        except Exception as exc:
            raise RetryableWorkerError("B2 output download verification failed") from exc

    def is_verified(self, spec: JobSpec, frame: int) -> bool:
        capability = self.rpc.storage_capability("frame_download", spec, frame=frame)
        if capability.get("exists") is not True:
            return False
        expected_size = capability.get("bytes")
        expected_digest = capability.get("sha256")
        if not isinstance(expected_size, int) or not isinstance(expected_digest, str):
            return False
        size, digest = self._remote_digest(capability)
        return size == expected_size and digest == expected_digest

    def put(self, spec: JobSpec, frame: int, output: Path) -> None:
        if self.is_verified(spec, frame):
            return
        digest = self._sha256(output)
        size = output.stat().st_size
        try:
            capability = self.rpc.storage_capability(
                "frame_upload", spec, frame=frame, size=size, sha256=digest
            )
            _upload_capability(capability, output)
        except Exception as exc:
            raise RetryableWorkerError("B2 output upload failed") from exc

    def verify(self, spec: JobSpec, frame: int, output: Path) -> None:
        capability = self.rpc.storage_capability("frame_download", spec, frame=frame)
        if capability.get("exists") is not True:
            raise RetryableWorkerError(f"B2 output verification failed for frame {frame}")
        size, digest = self._remote_digest(capability)
        if (
            capability.get("sha256") != self._sha256(output)
            or digest != capability.get("sha256")
            or size != output.stat().st_size
        ):
            raise RetryableWorkerError(f"B2 output verification failed for frame {frame}")


class ProductionReporter(Reporter):
    def __init__(self, rpc: ProductionRpcAdapter):
        self.rpc = rpc

    def stage(self, spec: JobSpec, state: str) -> None:
        self.rpc.update_stage(spec, state.lower())

    def progress(self, spec: JobSpec, frame: int, total: int) -> None:
        self.rpc.update_stage(spec, "rendering", frame)

    def complete(self, spec: JobSpec) -> None:
        self.rpc.complete(spec)

    def fail(self, spec: JobSpec, category: str, message: str) -> None:
        self.rpc.fail(spec, "permanent" if category == "permanent" else "transient")


class ProductionAttemptGuard(AttemptGuard):
    def __init__(self, rpc: ProductionRpcAdapter):
        self.rpc = rpc

    def assert_active(self, spec: JobSpec) -> None:
        self.rpc.heartbeat(spec)

    def heartbeat(self, spec: JobSpec, state: str) -> None:
        self.rpc.heartbeat(spec)


class _EngineHandle:
    def __init__(self, target: Any):
        self.error: BaseException | None = None
        self.done = False
        self.thread = threading.Thread(target=self._run, args=(target,), daemon=True)
        self.thread.start()

    def _run(self, target: Any) -> None:
        try:
            target()
        except BaseException as exc:
            self.error = exc
        finally:
            self.done = True


class ProductionNodeAgentRuntime:
    def __init__(self, config: ProductionConfig):
        token = WindowsProtectedCredentialStore(config.credential_file).load()
        self.config = config
        self.blender_exe = resolve_blender(
            config.blender_exe,
            config.blender_cache_dir,
            config.blender_download_url,
            config.blender_sha256,
        )
        self.rpc = ProductionRpcAdapter(
            WorkerRpcClient(
                config.backend_url,
                WorkerCredential(config.worker_id, token),
            ),
            config,
        )
        self.last_claim: JobSpec | None = None

    def _record_metrics(self, payload: Mapping[str, Any]) -> None:
        """Append redacted host metrics outside the per-attempt workspace."""
        path = self.config.workspace / "agent-metrics.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        record = {"timestamp": time.time(), **dict(payload)}
        with path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(record, separators=(",", ":")) + "\n")

    def _heartbeat(self) -> None:
        if self.last_claim is None:
            self.rpc.worker_ping()
        else:
            self.rpc.heartbeat(self.last_claim)

    def _report_state(self, state: Any) -> None:
        task_id = int(self.last_claim.task_id) if self.last_claim is not None else None
        try:
            self.rpc.transition(getattr(state, "value", str(state)), task_id)
        except Exception as exc:
            _LOGGER.warning("Worker state report failed: %s", type(exc).__name__)

    def _poll(self) -> Job | None:
        spec = self.rpc.claim()
        self.last_claim = spec
        return Job(spec.task_id, spec) if spec is not None else None

    def _prepare(self, job: Job) -> None:
        JobSpec.from_mapping(job.payload.__dict__)

    def _launch(self, job: Job) -> _EngineHandle:
        spec: JobSpec = job.payload

        def run() -> None:
            engine = WorkerEngine(
                workspace_root=self.config.workspace,
                downloader=DriveOrB2Downloader(self.config, self.rpc),
                preflight=BlenderScenePreflight(
                    self.blender_exe,
                    Path(__file__).with_name("blender_scene_analyzer.py"),
                    {
                        "vram_mb": self.config.worker_vram_mb,
                        "ram_mb": self.config.worker_ram_mb,
                    },
                ),
                renderer=BlenderCliRenderer(
                    self.blender_exe,
                    timeout_seconds=self.config.render_timeout_seconds,
                    use_job_object=True,
                    metrics_callback=self._record_metrics,
                ),
                checkpoints=ProductionB2CheckpointStore(self.rpc),
                validator=OutputIntegrityValidator(),
                reporter=ProductionReporter(self.rpc),
                guard=ProductionAttemptGuard(self.rpc),
            )
            engine.run(spec)

        return _EngineHandle(run)

    @staticmethod
    def _inspect(handle: _EngineHandle) -> WorkerResult:
        if not handle.done:
            return WorkerResult("running")
        if handle.error is None:
            return WorkerResult("completed", "engine_completed")
        if isinstance(handle.error, PermanentWorkerError):
            return WorkerResult("failed", str(handle.error))
        return WorkerResult("retryable", str(handle.error))

    def _cleanup(self, job: Job, result: WorkerResult) -> None:
        self.last_claim = None

    def run_forever(self) -> None:
        agent = NodeAgent(
            poll_job=self._poll,
            heartbeat=self._heartbeat,
            prepare_job=self._prepare,
            launch_worker=self._launch,
            inspect_worker=self._inspect,
            cleanup_job=self._cleanup,
            now=time.monotonic,
            heartbeat_interval=self.config.heartbeat_seconds,
            max_retries=0,
            non_blocking_heartbeat=True,
            runtime_policy=RuntimePolicy(state_observer=self._report_state),
        )
        poll_backoff = self.config.poll_seconds
        try:
            while True:
                try:
                    agent.tick()
                    poll_backoff = self.config.poll_seconds
                except Exception as exc:
                    # Network/cloud failures must not kill the supervisor. The
                    # backend lease timeout remains the recovery authority.
                    _LOGGER.warning("Node Agent tick failed: %s", type(exc).__name__)
                    time.sleep(min(poll_backoff, 60.0))
                    poll_backoff = min(poll_backoff * 2.0, 60.0)
                time.sleep(self.config.poll_seconds)
        finally:
            agent.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="CWS production Node Agent")
    parser.add_argument("--once", action="store_true", help="poll once and exit if idle")
    args = parser.parse_args()
    runtime = ProductionNodeAgentRuntime(ProductionConfig.from_env())
    if not args.once:
        runtime.run_forever()
        return 0
    runtime.rpc.worker_ping()
    spec = runtime.rpc.claim()
    if spec is None:
        return 0
    handle = runtime._launch(Job(spec.task_id, spec))
    while not handle.done:
        time.sleep(0.2)
    if handle.error is not None:
        raise handle.error
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
