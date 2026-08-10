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
import msvcrt
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
    BlenderSafePreparer,
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
from resilience_policy import (
    FailureCategory,
    bounded_exponential_backoff,
    stable_jitter_value,
)
from blender_bootstrap import resolve_blender
from node_engine import discover_host_capabilities, evaluate_readiness
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


class NodeAgentInstanceLock:
    """Crash-safe Windows file lock preventing duplicate Node Agent instances."""

    def __init__(self, workspace: Path):
        self.path = workspace / ".node-agent.lock"
        self._stream: Any | None = None

    def __enter__(self) -> "NodeAgentInstanceLock":
        self.path.parent.mkdir(parents=True, exist_ok=True)
        stream = self.path.open("a+b")
        if stream.tell() == 0:
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        try:
            msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError as exc:
            stream.close()
            raise PermanentWorkerError(
                "another CWS Node Agent instance is already running"
            ) from exc
        self._stream = stream
        return self

    def __exit__(self, *_args: Any) -> None:
        if self._stream is None:
            return
        self._stream.seek(0)
        try:
            msvcrt.locking(self._stream.fileno(), msvcrt.LK_UNLCK, 1)
        finally:
            self._stream.close()
            self._stream = None


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
    startup_jitter_seconds: float
    render_timeout_seconds: int

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "ProductionConfig":
        # An explicitly supplied empty mapping is a deliberate isolated
        # configuration in tests/bootstrap checks; do not silently fall back
        # to the process environment and accidentally accept production
        # credentials.
        values = os.environ if env is None else env

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

        def bounded_nonnegative_float(name: str, default: float, maximum: float) -> float:
            raw = values.get(name, str(default)).strip()
            try:
                result = float(raw)
            except ValueError as exc:
                raise PermanentWorkerError(f"{name} must be a number") from exc
            if result < 0 or result > maximum:
                raise PermanentWorkerError(f"{name} must be between 0 and {maximum}")
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
            startup_jitter_seconds=bounded_nonnegative_float(
                "CWS_WORKER_STARTUP_JITTER_SECONDS", 5.0, 30.0
            ),
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


def _stable_startup_jitter(worker_id: str, maximum_seconds: float) -> float:
    """Deterministically stagger fleet boot without a shared coordinator."""
    if maximum_seconds <= 0:
        return 0.0
    bucket = int(hashlib.sha256(worker_id.encode("utf-8")).hexdigest()[:8], 16)
    return maximum_seconds * bucket / 0xFFFFFFFF


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

    def probe(self, state: str, reason: str | None = None) -> str:
        payload: dict[str, Any] = {"p_probe_state": state}
        if reason:
            payload["p_reason"] = reason[:240]
        result = self.client.call("report_worker_probe", payload)
        return str(result)

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
        supported_input_schemes = ["b2"]
        if self.config.google_drive_api_key:
            supported_input_schemes.append("google_drive")
        claimed = _single_assignment(
            self.client.call(
                "claim_next_resilient_task",
                {
                    "p_worker_vram_mb": self.config.worker_vram_mb,
                    "p_supported_input_schemes": supported_input_schemes,
                },
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
            "p_generation": spec.ß6¶‰žËkºwµç@€€€€€€…ÁÑÕÉ•}½ÕÑÁÕÐõQÉÕ”°(€€€€€€€€€€€€€€€Ñ•áÐõQÉÕ”°(€€€€€€€€€€€€€€€Ñ¥µ•½ÕÐôÌÀÀ°(€€€€€€€€€€€€€€€•¹Øõ•¹Ø°(€€€€€€€€€€€€€€€¡•¬õ…±Í”°(€€€€€€€€€€€€¤(€€€€€€€•á•ÁÐ€¡=MÉÉ½È°ÍÕ‰ÁÉ½•ÍÌ¹Q¥µ•½ÕÑáÁ¥É•¤…Ì•áŒè(€€€€€€€€€€€É…¥Í”I•ÑÉå…‰±•]½É­•ÉÉÉ½È ‰	±•¹‘•ÈÍ•¹”ÁÉ•™±¥¡Ð™…¥±•ˆ¤™É½´•áŒ(€€€€€€€¥˜É•ÍÕ±Ð¹É•ÑÕÉ¹½‘”€„ô€À½È¹½ÐÉ•Á½ÉÐ¹¥Í}™¥±” ¤è(€€€€€€€€€€€É…¥Í”I•ÑÉå…‰±•]½É­•ÉÉÉ½È ‰	±•¹‘•ÈÍ•¹”…¹…±åé•È™…¥±•ˆ¤(€€€€€€€ÑÉäè(€€€€€€€€€€€…¹…±åÍ¥Ì€ô©Í½¸¹±½…‘Ì¡É•Á½ÉÐ¹É•…‘}Ñ•áÐ¡•¹½‘¥¹œô‰ÕÑ˜´àˆ¤¤(€€€€€€€•á•ÁÐ€¡=MÉÉ½È°©Í½¸¹)M=9•½‘•ÉÉ½È¤…Ì•áŒè(€€€€€€€€€€€É…¥Í”I•ÑÉå…‰±•]½É­•ÉÉÉ½È ‰	±•¹‘•ÈÍ•¹”…¹…±åÍ¥ÌÝ…Ì¥¹Ù…±¥ˆ¤™É½´•áŒ(€€€€€€€™¥¹…±±äè(€€€€€€€€€€€É•Á½ÉÐ¹Õ¹±¥¹¬¡µ¥ÍÍ¥¹}½¬õQÉÕ”¤(€€€€€€€µ¥ÍÍ¥¹œ€ô…¹…±åÍ¥Ì¹•Ð ‰µ¥ÍÍ¥¹}…ÍÍ•ÑÌˆ°mt¤(€€€€€€€¥˜µ¥ÍÍ¥¹œè(€€€€€€€€€€€É…¥Í”A•Éµ…¹•¹Ñ]½É­•ÉÉÉ½È (€€€€€€€€€€€€€€€˜‰Í•¹”¡…Ìí±•¸¡µ¥ÍÍ¥¹œ¥ôµ¥ÍÍ¥¹œ±¥¹­•…ÍÍ•Ð¡Ì¤ˆ(€€€€€€€€€€€€¤(()±…ÍÌAÉ½‘ÕÑ¥½¹É¡•­Á½¥¹ÑMÑ½É”¡¡•­Á½¥¹ÑMÑ½É”¤è(€€€‘•˜}}¥¹¥Ñ}|¡Í•±˜°ÉÁŒèAÉ½‘ÕÑ¥½¹IÁ‘…ÁÑ•È¤è(€€€€€€€Í•±˜¹ÉÁŒ€ôÉÁŒ((€€€ÍÑ…Ñ¥µ•Ñ¡½(€€€‘•˜}Í¡„ÈÔØ¡Á…Ñ èA…Ñ ¤€´øÍÑÈè(€€€€€€€‘¥•ÍÐ€ô¡…Í¡±¥ˆ¹Í¡„ÈÔØ ¤(€€€€€€€Ý¥Ñ Á…Ñ ¹½Á•¸ ‰Éˆˆ¤…ÌÍÑÉ•…´è(€€€€€€€€€€€™½È¡Õ¹¬¥¸¥Ñ•È¡±…µ‰‘„èÍÑÉ•…´¹É•… ÄÀÈÐ€¨€ÄÀÈÐ¤°ˆˆˆ¤è(€€€€€€€€€€€€€€€‘¥•ÍÐ¹ÕÁ‘…Ñ”¡¡Õ¹¬¤(€€€€€€€É•ÑÕÉ¸‘¥•ÍÐ¹¡•á‘¥•ÍÐ ¤((€€€‘•˜}É•µ½Ñ•}‘¥•ÍÐ¡Í•±˜°…Á…‰¥±¥Ñäè5…ÁÁ¥¹mÍÑÈ°¹åt¤€´øÑÕÁ±•m¥¹Ð°ÍÑÉtè(€€€€€€€‘¥•ÍÐ€ô¡…Í¡±¥ˆ¹Í¡„ÈÔØ ¤(€€€€€€€Í¥é”€ô€À(€€€€€€€ÑÉäè(€€€€€€€€€€€ÕÉ°€ô}…Á…‰¥±¥Ñå}ÕÉ°¡…Á…‰¥±¥Ñä°€‰Pˆ¤(€€€€€€€€€€€Ý¥Ñ ÕÉ±±¥ˆ¹É•ÅÕ•ÍÐ¹ÕÉ±½Á•¸¡ÕÉ°°Ñ¥µ•½ÕÐôÄÈÀ¤…ÌÉ•ÍÁ½¹Í”è(€€€€€€€€€€€€€€€Ý¡¥±”QÉÕ”è(€€€€€€€€€€€€€€€€€€€¡Õ¹¬€ôÉ•ÍÁ½¹Í”¹É•… ÄÀÈÐ€¨€ÄÀÈÐ¤(€€€€€€€€€€€€€€€€€€€¥˜¹½Ð¡Õ¹¬è(€€€€€€€€€€€€€€€€€€€€€€€‰É•…¬(€€€€€€€€€€€€€€€€€€€Í¥é”€¬ô±•¸¡¡Õ¹¬¤(€€€€€€€€€€€€€€€€€€€‘¥•ÍÐ¹ÕÁ‘…Ñ”¡¡Õ¹¬¤(€€€€€€€€€€€É•ÑÕÉ¸Í¥é”°‘¥•ÍÐ¹¡•á‘¥•ÍÐ ¤(€€€€€€€•á•ÁÐá•ÁÑ¥½¸…Ì•áŒè(€€€€€€€€€€€É…¥Í”I•ÑÉå…‰±•]½É­•ÉÉÉ½È ‰È½ÕÑÁÕÐ‘½Ý¹±½…Ù•É¥™¥…Ñ¥½¸™…¥±•ˆ¤™É½´•áŒ((€€€‘•˜¥Í}Ù•É¥™¥•¡Í•±˜°ÍÁ•Œè)½‰MÁ•Œ°™É…µ”è¥¹Ð¤€´ø‰½½°è(€€€€€€€…Á…‰¥±¥Ñä€ôÍ•±˜¹ÉÁŒ¹ÍÑ½É…•}…Á…‰¥±¥Ñä ‰™É…µ•}‘½Ý¹±½…ˆ°ÍÁ•Œ°™É…µ”õ™É…µ”¤(€€€€€€€¥˜…Á…‰¥±¥Ñä¹•Ð ‰•á¥ÍÑÌˆ¤¥Ì¹½ÐQÉÕ”è(€€€€€€€€€€€É•ÑÕÉ¸…±Í”(€€€€€€€•áÁ•Ñ•‘}Í¥é”€ô…Á…‰¥±¥Ñä¹•Ð ‰‰åÑ•Ìˆ¤(€€€€€€€•áÁ•Ñ•‘}‘¥•ÍÐ€ô…Á…‰¥±¥Ñä¹•Ð ‰Í¡„ÈÔØˆ¤(€€€€€€€¥˜¹½Ð¥Í¥¹ÍÑ…¹”¡•áÁ•Ñ•‘}Í¥é”°¥¹Ð¤½È¹½Ð¥Í¥¹ÍÑ…¹”¡•áÁ•Ñ•‘}‘¥•ÍÐ°ÍÑÈ¤è(€€€€€€€€€€€É•ÑÕÉ¸…±Í”(€€€€€€€Í¥é”°‘¥•ÍÐ€ôÍ•±˜¹}É•µ½Ñ•}‘¥•ÍÐ¡…Á…‰¥±¥Ñä¤(€€€€€€€É•ÑÕÉ¸Í¥é”€ôô•áÁ•Ñ•‘}Í¥é”…¹‘¥•ÍÐ€ôô•áÁ•Ñ•‘}‘¥•ÍÐ((€€€‘•˜ÁÕÐ¡Í•±˜°ÍÁ•Œè)½‰MÁ•Œ°™É…µ”è¥¹Ð°½ÕÑÁÕÐèA…Ñ ¤€´ø9½¹”è(€€€€€€€¥˜Í•±˜¹¥Í}Ù•É¥™¥•¡ÍÁ•Œ°™É…µ”¤è(€€€€€€€€€€€É•ÑÕÉ¸(€€€€€€€‘¥•ÍÐ€ôÍ•±˜¹}Í¡„ÈÔØ¡½ÕÑÁÕÐ¤(€€€€€€€Í¥é”€ô½ÕÑÁÕÐ¹ÍÑ…Ð ¤¹ÍÑ}Í¥é”(€€€€€€€ÑÉäè(€€€€€€€€€€€…Á…‰¥±¥Ñä€ôÍ•±˜¹ÉÁŒ¹ÍÑ½É…•}…Á…‰¥±¥Ñä (€€€€€€€€€€€€€€€€‰™É…µ•}ÕÁ±½…ˆ°ÍÁ•Œ°™É…µ”õ™É…µ”°Í¥é”õÍ¥é”°Í¡„ÈÔØõ‘¥•ÍÐ(€€€€€€€€€€€€¤(€€€€€€€€€€€}ÕÁ±½…‘}…Á…‰¥±¥Ñä¡…Á…‰¥±¥Ñä°½ÕÑÁÕÐ¤(€€€€€€€•á•ÁÐá•ÁÑ¥½¸…Ì•áŒè(€€€€€€€€€€€É…¥Í”I•ÑÉå…‰±•]½É­•ÉÉÉ½È ‰È½ÕÑÁÕÐÕÁ±½…™…¥±•ˆ¤™É½´•áŒ((€€€‘•˜Ù•É¥™ä¡Í•±˜°ÍÁ•Œè)½‰MÁ•Œ°™É…µ”è¥¹Ð°½ÕÑÁÕÐèA…Ñ ¤€´ø9½¹”è(€€€€€€€…Á…‰¥±¥Ñä€ôÍ•±˜¹ÉÁŒ¹ÍÑ½É…•}…Á…‰¥±¥Ñä ‰™É…µ•}‘½Ý¹±½…ˆ°ÍÁ•Œ°™É…µ”õ™É…µ”¤(€€€€€€€¥˜…Á…‰¥±¥Ñä¹•Ð ‰•á¥ÍÑÌˆ¤¥Ì¹½ÐQÉÕ”è(€€€€€€€€€€€É…¥Í”I•ÑÉå…‰±•]½É­•ÉÉÉ½È¡˜‰È½ÕÑÁÕÐÙ•É¥™¥…Ñ¥½¸™…¥±•™½È™É…µ”í™É…µ•ôˆ¤(€€€€€€€Í¥é”°‘¥•ÍÐ€ôÍ•±˜¹}É•µ½Ñ•}‘¥•ÍÐ¡…Á…‰¥±¥Ñä¤(€€€€€€€¥˜€ (€€€€€€€€€€€…Á…‰¥±¥Ñä¹•Ð ‰Í¡„ÈÔØˆ¤€„ôÍ•±˜¹}Í¡„ÈÔØ¡½ÕÑÁÕÐ¤(€€€€€€€€€€€½È‘¥•ÍÐ€„ô…Á…‰¥±¥Ñä¹•Ð ‰Í¡„ÈÔØˆ¤(€€€€€€€€€€€½ÈÍ¥é”€„ô½ÕÑÁÕÐ¹ÍÑ…Ð ¤¹ÍÑ}Í¥é”(€€€€€€€€¤è(€€€€€€€€€€€É…¥Í”I•ÑÉå…‰±•]½É­•ÉÉÉ½È¡˜‰È½ÕÑÁÕÐÙ•É¥™¥…Ñ¥½¸™…¥±•™½È™É…µ”í™É…µ•ôˆ¤(()±…ÍÌAÉ½‘ÕÑ¥½¹I•Á½ÉÑ•È¡I•Á½ÉÑ•È¤è(€€€‘•˜}}¥¹¥Ñ}|¡Í•±˜°ÉÁŒèAÉ½‘ÕÑ¥½¹IÁ‘…ÁÑ•È¤è(€€€€€€€Í•±˜¹ÉÁŒ€ôÉÁŒ((€€€‘•˜ÍÑ…”¡Í•±˜°ÍÁ•Œè)½‰MÁ•Œ°ÍÑ…Ñ”èÍÑÈ¤€´ø9½¹”è(€€€€€€€Í•±˜¹ÉÁŒ¹ÕÁ‘…Ñ•}ÍÑ…”¡ÍÁ•Œ°ÍÑ…Ñ”¹±½Ý•È ¤¤((€€€‘•˜ÁÉ½É•ÍÌ¡Í•±˜°ÍÁ•Œè)½‰MÁ•Œ°™É…µ”è¥¹Ð°Ñ½Ñ…°è¥¹Ð¤€´ø9½¹”è(€€€€€€€Í•±˜¹ÉÁŒ¹ÕÁ‘…Ñ•}ÍÑ…”¡ÍÁ•Œ°€‰É•¹‘•É¥¹œˆ°™É…µ”¤((€€€‘•˜½µÁ±•Ñ”¡Í•±˜°ÍÁ•Œè)½‰MÁ•Œ¤€´ø9½¹”è(€€€€€€€Í•±˜¹ÉÁŒ¹½µÁ±•Ñ”¡ÍÁ•Œ¤((€€€‘•˜™…¥°¡Í•±˜°ÍÁ•Œè)½‰MÁ•Œ°…Ñ•½ÉäèÍÑÈ°µ•ÍÍ…”èÍÑÈ¤€´ø9½¹”è(€€€€€€€ÑÉäè(€€€€€€€€€€€¹½Éµ…±¥é•€ô…¥±ÕÉ•…Ñ•½Éä¡…Ñ•½Éä¹ÕÁÁ•È ¤¤¹Ù…±Õ”(€€€€€€€•á•ÁÐY…±Õ•ÉÉ½Èè(€€€€€€€€€€€¹½Éµ…±¥é•€ô…¥±ÕÉ•…Ñ•½Éä¹9Q]=I-}QI9M%9P¹Ù…±Õ”(€€€€€€€Í•±˜¹ÉÁŒ¹™…¥°¡ÍÁ•Œ°¹½Éµ…±¥é•°µ•ÍÍ…”¤(()±…ÍÌAÉ½‘ÕÑ¥½¹ÑÑ•µÁÑÕ…É¡ÑÑ•µÁÑÕ…É¤è(€€€‘•˜}}¥¹¥Ñ}|¡Í•±˜°ÉÁŒèAÉ½‘ÕÑ¥½¹IÁ‘…ÁÑ•È¤è(€€€€€€€Í•±˜¹ÉÁŒ€ôÉÁŒ((€€€‘•˜…ÍÍ•ÉÑ}…Ñ¥Ù”¡Í•±˜°ÍÁ•Œè)½‰MÁ•Œ¤€´ø9½¹”è(€€€€€€€Í•±˜¹ÉÁŒ¹¡•…ÉÑ‰•…Ð¡ÍÁ•Œ¤((€€€‘•˜¡•…ÉÑ‰•…Ð¡Í•±˜°ÍÁ•Œè)½‰MÁ•Œ°ÍÑ…Ñ”èÍÑÈ¤€´ø9½¹”è(€€€€€€€Í•±˜¹ÉÁŒ¹¡•…ÉÑ‰•…Ð¡ÍÁ•Œ¤(()±…ÍÌ}¹¥¹•!…¹‘±”è(€€€‘•˜}}¥¹¥Ñ}|¡Í•±˜°Ñ…É•Ðè¹ä¤è(€€€€€€€Í•±˜¹•ÉÉ½Èè	…Í•á•ÁÑ¥½¸ð9½¹”€ô9½¹”(€€€€€€€Í•±˜¹‘½¹”€ô…±Í”(€€€€€€€Í•±˜¹Ñ¡É•…€ôÑ¡É•…‘¥¹œ¹Q¡É•…¡Ñ…É•ÐõÍ•±˜¹}ÉÕ¸°…ÉÌô¡Ñ…É•Ð°¤°‘…•µ½¸õQÉÕ”¤(€€€€€€€Í•±˜¹Ñ¡É•…¹ÍÑ…ÉÐ ¤((€€€‘•˜}ÉÕ¸¡Í•±˜°Ñ…É•Ðè¹ä¤€´ø9½¹”è(€€€€€€€ÑÉäè(€€€€€€€€€€€Ñ…É•Ð ¤(€€€€€€€•á•ÁÐ	…Í•á•ÁÑ¥½¸…Ì•áŒè(€€€€€€€€€€€Í•±˜¹•ÉÉ½È€ô•áŒ(€€€€€€€™¥¹…±±äè(€€€€€€€€€€€Í•±˜¹‘½¹”€ôQÉÕ”(()±…ÍÌAÉ½‘ÕÑ¥½¹9½‘••¹ÑIÕ¹Ñ¥µ”è(€€€‘•˜}}¥¹¥Ñ}|¡Í•±˜°½¹™¥œèAÉ½‘ÕÑ¥½¹½¹™¥œ¤è(€€€€€€€Ñ½­•¸€ô]¥¹‘½ÝÍAÉ½Ñ•Ñ•‘É•‘•¹Ñ¥…±MÑ½É”¡½¹™¥œ¹É•‘•¹Ñ¥…±}™¥±”¤¹±½… ¤(€€€€€€€Í•±˜¹½¹™¥œ€ô½¹™¥œ(€€€€€€€Í•±˜¹‰±•¹‘•É}•á”€ôÉ•Í½±Ù•}‰±•¹‘•È (€€€€€€€€€€€½¹™¥œ¹‰±•¹‘•É}•á”°(€€€€€€€€€€€½¹™¥œ¹‰±•¹‘•É}…¡•}‘¥È°(€€€€€€€€€€€½¹™¥œ¹‰±•¹‘•É}‘½Ý¹±½…‘}ÕÉ°°(€€€€€€€€€€€½¹™¥œ¹‰±•¹‘•É}Í¡„ÈÔØ°(€€€€€€€€¤(€€€€€€€Í•±˜¹ÉÁŒ€ôAÉ½‘ÕÑ¥½¹IÁ‘…ÁÑ•È (€€€€€€€€€€€]½É­•ÉIÁ±¥•¹Ð (€€€€€€€€€€€€€€€½¹™¥œ¹‰…­•¹‘}ÕÉ°°(€€€€€€€€€€€€€€€]½É­•ÉÉ•‘•¹Ñ¥…°¡½¹™¥œ¹Ý½É­•É}¥°Ñ½­•¸¤°(€€€€€€€€€€€€¤°(€€€€€€€€€€€½¹™¥œ°(€€€€€€€€¤(€€€€€€€Í•±˜¹±…ÍÑ}±…¥´è)½‰MÁ•Œð9½¹”€ô9½¹”((€€€‘•˜}É•½É‘}µ•ÑÉ¥Ì¡Í•±˜°Á…å±½…è5…ÁÁ¥¹mÍÑÈ°¹åt¤€´ø9½¹”è(€€€€€€€€ˆˆ‰ÁÁ•¹É•‘…Ñ•¡½ÍÐµ•ÑÉ¥Ì½ÕÑÍ¥‘”Ñ¡”Á•Èµ…ÑÑ•µÁÐÝ½É­ÍÁ…”¸ˆˆˆ(€€€€€€€Á…Ñ €ôÍ•±˜¹½¹™¥œ¹Ý½É­ÍÁ…”€¼€‰…•¹Ðµµ•ÑÉ¥Ì¹©Í½¹°ˆ(€€€€€€€Á…Ñ ¹Á…É•¹Ð¹µ­‘¥È¡Á…É•¹ÑÌõQÉÕ”°•á¥ÍÑ}½¬õQÉÕ”¤(€€€€€€€É•½É€ôì‰Ñ¥µ•ÍÑ…µÀˆèÑ¥µ”¹Ñ¥µ” ¤°€¨©‘¥Ð¡Á…å±½…¥ô(€€€€€€€Ý¥Ñ Á…Ñ ¹½Á•¸ ‰„ˆ°•¹½‘¥¹œô‰ÕÑ˜´àˆ¤…ÌÍÑÉ•…´è(€€€€€€€€€€€ÍÑÉ•…´¹ÝÉ¥Ñ”¡©Í½¸¹‘ÕµÁÌ¡É•½É°Í•Á…É…Ñ½ÉÌô ˆ°ˆ°€ˆèˆ¤¤€¬€‰q¸ˆ¤((€€€‘•˜}¡•…ÉÑ‰•…Ð¡Í•±˜¤€´ø9½¹”è(€€€€€€€¥˜Í•±˜¹±…ÍÑ}±…¥´¥Ì9½¹”è(€€€€€€€€€€€Í•±˜¹ÉÁŒ¹Ý½É­•É}Á¥¹œ ¤(€€€€€€€•±Í”è(€€€€€€€€€€€Í•±˜¹ÉÁŒ¹¡•…ÉÑ‰•…Ð¡Í•±˜¹±…ÍÑ}±…¥´¤((€€€‘•˜}É•Á½ÉÑ}ÍÑ…Ñ”¡Í•±˜°ÍÑ…Ñ”è¹ä¤€´ø9½¹”è(€€€€€€€Ñ…Í­}¥€ô¥¹Ð¡Í•±˜¹±…ÍÑ}±…¥´¹Ñ…Í­}¥¤¥˜Í•±˜¹±…ÍÑ}±…¥´¥Ì¹½Ð9½¹”•±Í”9½¹”(€€€€€€€ÑÉäè(€€€€€€€€€€€Í•±˜¹ÉÁŒ¹ÑÉ…¹Í¥Ñ¥½¸¡•Ñ…ÑÑÈ¡ÍÑ…Ñ”°€‰Ù…±Õ”ˆ°ÍÑÈ¡ÍÑ…Ñ”¤¤°Ñ…Í­}¥¤(€€€€€€€•á•ÁÐá•ÁÑ¥½¸…Ì•áŒè(€€€€€€€€€€€}1=H¹Ý…É¹¥¹œ ‰]½É­•ÈÍÑ…Ñ”É•Á½ÉÐ™…¥±•è€•Ìˆ°ÑåÁ”¡•áŒ¤¹}}¹…µ•}|¤((€€€‘•˜}Á½±°¡Í•±˜¤€´ø)½ˆð9½¹”è(€€€€€€€ÍÁ•Œ€ôÍ•±˜¹ÉÁŒ¹±…¥´ ¤(€€€€€€€Í•±˜¹±…ÍÑ}±…¥´€ôÍÁ•Œ(€€€€€€€É•ÑÕÉ¸)½ˆ¡ÍÁ•Œ¹Ñ…Í­}¥°ÍÁ•Œ¤¥˜ÍÁ•Œ¥Ì¹½Ð9½¹”•±Í”9½¹”((€€€‘•˜}ÁÉ½‰•}±½…±}ÉÕ¹Ñ¥µ”¡Í•±˜¤€´ø9½¹”è(€€€€€€€€ˆˆ‰IÕ¸½¹±ä±¥¡ÑÝ•¥¡Ð¡½ÍÐ¡•­Ìì¹•Ù•È½¹ÍÕµ”„ÕÍÑ½µ•ÈÑ…Í¬¸ˆˆˆ(€€€€€€€Í•±˜¹½¹™¥œ¹Ý½É­ÍÁ…”¹µ­‘¥È¡Á…É•¹ÑÌõQÉÕ”°•á¥ÍÑ}½¬õQÉÕ”¤(€€€€€€€ÁÉ½‰•}Á…Ñ €ôÍ•±˜¹½¹™¥œ¹Ý½É­ÍÁ…”€¼€ˆ¹ÝÌµ¡•…±Ñ µÁÉ½‰”ˆ(€€€€€€€ÁÉ½‰•}Á…Ñ ¹ÝÉ¥Ñ•}Ñ•áÐ ‰½¬ˆ°•¹½‘¥¹œô‰…Í¥¤ˆ¤(€€€€€€€ÁÉ½‰•}Á…Ñ ¹Õ¹±¥¹¬¡µ¥ÍÍ¥¹}½¬õQÉÕ”¤(€€€€€€€¥˜¹½ÐÍ•±˜¹‰±•¹‘•É}•á”¹¥Í}™¥±” ¤è(€€€€€€€€€€€É…¥Í”A•Éµ…¹•¹Ñ]½É­•ÉÉÉ½È (€€€€€€€€€€€€€€€€‰	±•¹‘•È•á•ÕÑ…‰±”¥ÌÕ¹…Ù…¥±…‰±”ˆ°…¥±ÕÉ•…Ñ•½Éä¹]=I-I}!=MQ}II=H(€€€€€€€€€€€€¤(€€€€€€€…Á…‰¥±¥Ñ¥•Ì€ô‘¥Í½Ù•É}¡½ÍÑ}…Á…‰¥±¥Ñ¥•Ì¡Í•±˜¹‰±•¹‘•É}•á”°Í•±˜¹½¹™¥œ¹Ý½É­ÍÁ…”¤(€€€€€€€É•…‘¥¹•ÍÌ€ô•Ù…±Õ…Ñ•}É•…‘¥¹•ÍÌ (€€€€€€€€€€€‰…­•¹‘}ÕÉ°õÍ•±˜¹½¹™¥œ¹‰…­•¹‘}ÕÉ°°(€€€€€€€€€€€Ý½É­•É}¥õÍ•±˜¹½¹™¥œ¹Ý½É­•É}¥°(€€€€€€€€€€€É•‘•¹Ñ¥…±}™¥±”õÍ•±˜¹½¹™¥œ¹É•‘•¹Ñ¥…±}™¥±”°(€€€€€€€€€€€Ý½É­ÍÁ…”õÍ•±˜¹½¹™¥œ¹Ý½É­ÍÁ…”°(€€€€€€€€€€€…Á…‰¥±¥Ñ¥•Ìõ…Á…‰¥±¥Ñ¥•Ì°(€€€€€€€€¤(€€€€€€€Í•±˜¹}É•½É‘}µ•ÑÉ¥Ì (€€€€€€€€€€€ì(€€€€€€€€€€€€€€€€‰•Ù•¹Ðˆè€‰¹½‘•}É•…‘¥¹•ÍÌˆ°(€€€€€€€€€€€€€€€€‰É•…‘¥¹•ÍÌˆèÉ•…‘¥¹•ÍÌ¹…Í}‘¥Ð ¤°(€€€€€€€€€€€€€€€€‰…Á…‰¥±¥Ñ¥•Ìˆè…Á…‰¥±¥Ñ¥•Ì¹…Í}‘¥Ð ¤°(€€€€€€€€€€€ô(€€€€€€€€¤(€€€€€€€¥˜¹½ÐÉ•…‘¥¹•ÍÌ¹É•…‘äè(€€€€€€€€€€€É…¥Í”A•Éµ…¹•¹Ñ]½É­•ÉÉÉ½È (€€€€€€€€€€€€€€€€‰9½‘”¹¥¹”É•…‘¥¹•ÍÌ™…¥±•è€ˆ€¬€ˆ°ˆ¹©½¥¸¡É•…‘¥¹•ÍÌ¹É•…Í½¹Ì¤°(€€€€€€€€€€€€€€€…¥±ÕÉ•…Ñ•½Éä¹]=I-I}!=MQ}II=H°(€€€€€€€€€€€€¤((€€€‘•˜}…ÑÑ•µÁÑ}¡•…±Ñ¡}ÁÉ½‰”¡Í•±˜¤€´ø‰½½°è(€€€€€€€¥˜¹½Ð¡…Í…ÑÑÈ¡Í•±˜¹ÉÁŒ°€‰ÁÉ½‰”ˆ¤è(€€€€€€€€€€€É•ÑÕÉ¸…±Í”(€€€€€€€ÑÉäè(€€€€€€€€€€€ÍÑ…Ñ”€ôÍ•±˜¹ÉÁŒ¹ÁÉ½‰” ‰AI=	%9ˆ°€‰…ÕÑ¡•¹Ñ¥…Ñ•ÍÑ…ÉÑÕÀ½É•½Ù•ÉäÁÉ½‰”ˆ¤(€€€€€€€€€€€¥˜ÍÑ…Ñ”€ôô€‰‰±½­•ˆè(€€€€€€€€€€€€€€€É•ÑÕÉ¸…±Í”(€€€€€€€€€€€¥˜ÍÑ…Ñ”€„ô€‰ÁÉ½‰¥¹œˆè(€€€€€€€€€€€€€€€É•ÑÕÉ¸…±Í”(€€€€€€€€€€€ÑÉäè(€€€€€€€€€€€€€€€Í•±˜¹}ÁÉ½‰•}±½…±}ÉÕ¹Ñ¥µ” ¤(€€€€€€€€€€€•á•ÁÐá•ÁÑ¥½¸…Ì•áŒè(€€€€€€€€€€€€€€€Í•±˜¹ÉÁŒ¹ÁÉ½‰” ‰%1ˆ°ÑåÁ”¡•áŒ¤¹}}¹…µ•}|¤(€€€€€€€€€€€€€€€É•ÑÕÉ¸…±Í”(€€€€€€€€€€€É•ÑÕÉ¸Í•±˜¹ÉÁŒ¹ÁÉ½‰” ‰=,ˆ°€‰‰…­•¹…ÕÑ °Ý½É­ÍÁ…”…¹	±•¹‘•È¡•­ÌÁ…ÍÍ•ˆ¤€ôô€‰¡•…±Ñ¡äˆ(€€€€€€€•á•ÁÐá•ÁÑ¥½¸…Ì•áŒè(€€€€€€€€€€€}1=H¹Ý…É¹¥¹œ ‰]½É­•È¡•…±Ñ ÁÉ½‰”™…¥±•è€•Ìˆ°ÑåÁ”¡•áŒ¤¹}}¹…µ•}|¤(€€€€€€€€€€€É•ÑÕÉ¸…±Í”((€€€‘•˜}ÁÉ•Á…É”¡Í•±˜°©½ˆè)½ˆ¤€´ø9½¹”è(€€€€€€€)½‰MÁ•Œ¹™É½µ}µ…ÁÁ¥¹œ¡©½ˆ¹Á…å±½…¹}}‘¥Ñ}|¤((€€€‘•˜}±…Õ¹ ¡Í•±˜°©½ˆè)½ˆ¤€´ø}¹¥¹•!…¹‘±”è(€€€€€€€ÍÁ•Œè)½‰MÁ•Œ€ô©½ˆ¹Á…å±½…((€€€€€€€‘•˜ÉÕ¸ ¤€´ø9½¹”è(€€€€€€€€€€€•¹¥¹”€ô]½É­•É¹¥¹” (€€€€€€€€€€€€€€€Ý½É­ÍÁ…•}É½½ÐõÍ•±˜¹½¹™¥œ¹Ý½É­ÍÁ…”°(€€€€€€€€€€€€€€€‘½Ý¹±½…‘•ÈõÉ¥Ù•=ÉÉ½Ý¹±½…‘•È¡Í•±˜¹½¹™¥œ°Í•±˜¹ÉÁŒ¤°(€€€€€€€€€€€€€€€ÁÉ•™±¥¡Ðõ	±•¹‘•ÉM•¹•AÉ•™±¥¡Ð (€€€€€€€€€€€€€€€€€€€Í•±˜¹‰±•¹‘•É}•á”°(€€€€€€€€€€€€€€€€€€€A…Ñ ¡}}™¥±•}|¤¹Ý¥Ñ¡}¹…µ” ‰‰±•¹‘•É}Í•¹•}…¹…±åé•È¹Áäˆ¤°(€€€€€€€€€€€€€€€€€€€ì(€€€€€€€€€€€€€€€€€€€€€€€€‰ÙÉ…µ}µˆˆèÍ•±˜¹½¹™¥œ¹Ý½É­•É}ÙÉ…µ}µˆ°(€€€€€€€€€€€€€€€€€€€€€€€€‰É…µ}µˆˆèÍ•±˜¹½¹™¥œ¹Ý½É­•É}É…µ}µˆ°(€€€€€€€€€€€€€€€€€€€ô°(€€€€€€€€€€€€€€€€¤°(€€€€€€€€€€€€€€€É•¹‘•É•Èõ	±•¹‘•É±¥I•¹‘•É•È (€€€€€€€€€€€€€€€€€€€Í•±˜¹‰±•¹‘•É}•á”°(€€€€€€€€€€€€€€€€€€€Ñ¥µ•½ÕÑ}Í•½¹‘ÌõÍ•±˜¹½¹™¥œ¹É•¹‘•É}Ñ¥µ•½ÕÑ}Í•½¹‘Ì°(€€€€€€€€€€€€€€€€€€€ÕÍ•}©½‰}½‰©•ÐõQÉÕ”°(€€€€€€€€€€€€€€€€€€€µ•ÑÉ¥Í}…±±‰…¬õÍ•±˜¹}É•½É‘}µ•ÑÉ¥Ì°(€€€€€€€€€€€€€€€€¤°(€€€€€€€€€€€€€€€¡•­Á½¥¹ÑÌõAÉ½‘ÕÑ¥½¹É¡•­Á½¥¹ÑMÑ½É”¡Í•±˜¹ÉÁŒ¤°(€€€€€€€€€€€€€€€Ù…±¥‘…Ñ½Èõ=ÕÑÁÕÑ%¹Ñ•É¥ÑåY…±¥‘…Ñ½È ¤°(€€€€€€€€€€€€€€€É•Á½ÉÑ•ÈõAÉ½‘ÕÑ¥½¹I•Á½ÉÑ•È¡Í•±˜¹ÉÁŒ¤°(€€€€€€€€€€€€€€€Õ…ÉõAÉ½‘ÕÑ¥½¹ÑÑ•µÁÑÕ…É¡Í•±˜¹ÉÁŒ¤°(€€€€€€€€€€€€€€€ÁÉ•Á…É•Èõ	±•¹‘•ÉM…™•AÉ•Á…É•È (€€€€€€€€€€€€€€€€€€€Í•±˜¹‰±•¹‘•É}•á”°(€€€€€€€€€€€€€€€€€€€A…Ñ ¡}}™¥±•}|¤¹Ý¥Ñ¡}¹…µ” ‰‰±•¹‘•É}Í•¹•}…¹…±åé•È¹Áäˆ¤°(€€€€€€€€€€€€€€€€¤°(€€€€€€€€€€€€¤(€€€€€€€€€€€•¹¥¹”¹ÉÕ¸¡ÍÁ•Œ¤((€€€€€€€É•ÑÕÉ¸}¹¥¹•!…¹‘±”¡ÉÕ¸¤((€€€ÍÑ…Ñ¥µ•Ñ¡½(€€€‘•˜}¥¹ÍÁ•Ð¡¡…¹‘±”è}¹¥¹•!…¹‘±”¤€´ø]½É­•ÉI•ÍÕ±Ðè(€€€€€€€¥˜¹½Ð¡…¹‘±”¹‘½¹”è(€€€€€€€€€€€É•ÑÕÉ¸]½É­•ÉI•ÍÕ±Ð ‰ÉÕ¹¹¥¹œˆ¤(€€€€€€€¥˜¡…¹‘±”¹•ÉÉ½È¥Ì9½¹”è(€€€€€€€€€€€É•ÑÕÉ¸]½É­•ÉI•ÍÕ±Ð ‰½µÁ±•Ñ•ˆ°€‰•¹¥¹•}½µÁ±•Ñ•ˆ¤(€€€€€€€¥˜¥Í¥¹ÍÑ…¹”¡¡…¹‘±”¹•ÉÉ½È°A•Éµ…¹•¹Ñ]½É­•ÉÉÉ½È¤è(€€€€€€€€€€€É•ÑÕÉ¸]½É­•ÉI•ÍÕ±Ð ‰™…¥±•ˆ°ÍÑÈ¡¡…¹‘±”¹•ÉÉ½È¤¤(€€€€€€€É•ÑÕÉ¸]½É­•ÉI•ÍÕ±Ð ‰É•ÑÉå…‰±”ˆ°ÍÑÈ¡¡…¹‘±”¹•ÉÉ½È¤¤((€€€‘•˜}±•…¹ÕÀ¡Í•±˜°©½ˆè)½ˆ°É•ÍÕ±Ðè]½É­•ÉI•ÍÕ±Ð¤€´ø9½¹”è(€€€€€€€Í•±˜¹±…ÍÑ}±…¥´€ô9½¹”((€€€‘•˜ÉÕ¹}™½É•Ù•È¡Í•±˜¤€´ø9½¹”è(€€€€€€€Ñ¥µ”¹Í±••À (€€€€€€€€€€€}ÍÑ…‰±•}ÍÑ…ÉÑÕÁ}©¥ÑÑ•È (€€€€€€€€€€€€€€€Í•±˜¹½¹™¥œ¹Ý½É­•É}¥°(€€€€€€€€€€€€€€€µ¥¸¡Í•±˜¹½¹™¥œ¹ÍÑ…ÉÑÕÁ}©¥ÑÑ•É}Í•½¹‘Ì°Í•±˜¹½¹™¥œ¹Á½±±}Í•½¹‘Ì¤°(€€€€€€€€€€€€¤(€€€€€€€€¤(€€€€€€€Í•±˜¹}…ÑÑ•µÁÑ}¡•…±Ñ¡}ÁÉ½‰” ¤(€€€€€€€…•¹Ð€ô9½‘••¹Ð (€€€€€€€€€€€Á½±±}©½ˆõÍ•±˜¹}Á½±°°(€€€€€€€€€€€¡•…ÉÑ‰•…ÐõÍ•±˜¹}¡•…ÉÑ‰•…Ð°(€€€€€€€€€€€ÁÉ•Á…É•}©½ˆõÍ•±˜¹}ÁÉ•Á…É”°(€€€€€€€€€€€±…Õ¹¡}Ý½É­•ÈõÍ•±˜¹}±…Õ¹ °(€€€€€€€€€€€¥¹ÍÁ•Ñ}Ý½É­•ÈõÍ•±˜¹}¥¹ÍÁ•Ð°(€€€€€€€€€€€±•…¹ÕÁ}©½ˆõÍ•±˜¹}±•…¹ÕÀ°(€€€€€€€€€€€¹½ÜõÑ¥µ”¹µ½¹½Ñ½¹¥Œ°(€€€€€€€€€€€¡•…ÉÑ‰•…Ñ}¥¹Ñ•ÉÙ…°õÍ•±˜¹½¹™¥œ¹¡•…ÉÑ‰•…Ñ}Í•½¹‘Ì°(€€€€€€€€€€€µ…á}É•ÑÉ¥•ÌôÀ°(€€€€€€€€€€€¹½¹}‰±½­¥¹}¡•…ÉÑ‰•…ÐõQÉÕ”°(€€€€€€€€€€€ÉÕ¹Ñ¥µ•}Á½±¥äõIÕ¹Ñ¥µ•A½±¥ä¡ÍÑ…Ñ•}½‰Í•ÉÙ•ÈõÍ•±˜¹}É•Á½ÉÑ}ÍÑ…Ñ”¤°(€€€€€€€€¤(€€€€€€€Á½±±}…ÑÑ•µÁÐ€ô€À(€€€€€€€ÑÉäè(€€€€€€€€€€€Ý¡¥±”QÉÕ”è(€€€€€€€€€€€€€€€ÑÉäè(€€€€€€€€€€€€€€€€€€€…•¹Ð¹Ñ¥¬ ¤(€€€€€€€€€€€€€€€€€€€Á½±±}…ÑÑ•µÁÐ€ô€À(€€€€€€€€€€€€€€€•á•ÁÐá•ÁÑ¥½¸…Ì•áŒè(€€€€€€€€€€€€€€€€€€€€Œ9•ÑÝ½É¬½±½Õ™…¥±ÕÉ•ÌµÕÍÐ¹½Ð­¥±°Ñ¡”ÍÕÁ•ÉÙ¥Í½È¸Q¡”(€€€€€€€€€€€€€€€€€€€€Œ‰…­•¹±•…Í”Ñ¥µ•½ÕÐÉ•µ…¥¹ÌÑ¡”É•½Ù•Éä…ÕÑ¡½É¥Ñä¸(€€€€€€€€€€€€€€€€€€€}1=H¹Ý…É¹¥¹œ ‰9½‘”•¹ÐÑ¥¬™…¥±•è€•Ìˆ°ÑåÁ”¡•áŒ¤¹}}¹…µ•}|¤(€€€€€€€€€€€€€€€€€€€Á½±±}…ÑÑ•µÁÐ€¬ô€Ä(€€€€€€€€€€€€€€€€€€€Ñ¥µ”¹Í±••À (€€€€€€€€€€€€€€€€€€€€€€€‰½Õ¹‘•‘}•áÁ½¹•¹Ñ¥…±}‰…­½™˜ (€€€€€€€€€€€€€€€€€€€€€€€€€€€Í•±˜¹½¹™¥œ¹Á½±±}Í•½¹‘Ì°(€€€€€€€€€€€€€€€€€€€€€€€€€€€Á½±±}…ÑÑ•µÁÐ°(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ØÀ¸À°(€€€€€€€€€€€€€€€€€€€€€€€€€€€©¥ÑÑ•É}Ù…±Õ”õÍÑ…‰±•}©¥ÑÑ•É}Ù…±Õ” (€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€€Í•±˜¹½¹™¥œ¹Ý½É­•É}¥°Á½±±}…ÑÑ•µÁÐ(€€€€€€€€€€€€€€€€€€€€€€€€€€€€¤°(€€€€€€€€€€€€€€€€€€€€€€€€¤(€€€€€€€€€€€€€€€€€€€€¤(€€€€€€€€€€€€€€€Ñ¥µ”¹Í±••À¡Í•±˜¹½¹™¥œ¹Á½±±}Í•½¹‘Ì¤(€€€€€€€™¥¹…±±äè(€€€€€€€€€€€…•¹Ð¹±½Í” ¤((€€€‘•˜ÉÕ¹}¡•…ÉÑ‰•…Ñ}½¹±ä¡Í•±˜¤€´ø9½¹”è(€€€€€€€€ˆˆ‰5…¥¹Ñ…¥¸…ÕÑ¡•¹Ñ¥…Ñ•ÁÉ•Í•¹”Ý¥Ñ¡½ÕÐ±…¥µ¥¹œÅÕ•Õ•Ý½É¬¸((€€€€€€€Q¡¥Ì¥Ì„‰½Õ¹‘•½Á•É…Ñ¥½¹…°µ½‘”™½Èµ…¥¹Ñ•¹…¹”½É•…‘¥¹•ÍÌÝ¥¹‘½ÝÌì(€€€€€€€¹½Éµ…°ÁÉ½‘ÕÑ¥½¸É•¹‘•É¥¹œ½¹Ñ¥¹Õ•ÌÑ¼ÕÍ”ÉÕ¹}™½É•Ù•É€¸(€€€€€€€€ˆˆˆ(€€€€€€€Ñ¥µ”¹Í±••À (€€€€€€€€€€€}ÍÑ…‰±•}ÍÑ…ÉÑÕÁ}©¥ÑÑ•È (€€€€€€€€€€€€€€€Í•±˜¹½¹™¥œ¹Ý½É­•É}¥°(€€€€€€€€€€€€€€€µ¥¸ (€€€€€€€€€€€€€€€€€€€Í•±˜¹½¹™¥œ¹ÍÑ…ÉÑÕÁ}©¥ÑÑ•É}Í•½¹‘Ì°(€€€€€€€€€€€€€€€€€€€Í•±˜¹½¹™¥œ¹¡•…ÉÑ‰•…Ñ}Í•½¹‘Ì°(€€€€€€€€€€€€€€€€¤°(€€€€€€€€€€€€¤(€€€€€€€€¤(€€€€€€€Í•±˜¹}…ÑÑ•µÁÑ}¡•…±Ñ¡}ÁÉ½‰” ¤(€€€€€€€Í•±˜¹ÉÁŒ¹ÑÉ…¹Í¥Ñ¥½¸ ‰Q%Y}%1ˆ°É•…Í½¸ô‰¡•…ÉÑ‰•…Ñ}½¹±äˆ¤(€€€€€€€‰…­½™˜€ôÍ•±˜¹½¹™¥œ¹¡•…ÉÑ‰•…Ñ}Í•½¹‘Ì(€€€€€€€Ý¡¥±”QÉÕ”è(€€€€€€€€€€€ÑÉäè(€€€€€€€€€€€€€€€Í•±˜¹ÉÁŒ¹Ý½É­•É}Á¥¹œ ¤(€€€€€€€€€€€€€€€‰…­½™˜€ôÍ•±˜¹½¹™¥œ¹¡•…ÉÑ‰•…Ñ}Í•½¹‘Ì(€€€€€€€€€€€€€€€Ñ¥µ”¹Í±••À¡Í•±˜¹½¹™¥œ¹¡•…ÉÑ‰•…Ñ}Í•½¹‘Ì¤(€€€€€€€€€€€•á•ÁÐá•ÁÑ¥½¸…Ì•áŒè(€€€€€€€€€€€€€€€}1=H¹Ý…É¹¥¹œ ‰!•…ÉÑ‰•…Ðµ½¹±äÁ¥¹œ™…¥±•è€•Ìˆ°ÑåÁ”¡•áŒ¤¹}}¹…µ•}|¤(€€€€€€€€€€€€€€€Ñ¥µ”¹Í±••À¡µ¥¸¡‰…­½™˜°€ØÀ¸À¤¤(€€€€€€€€€€€€€€€‰…­½™˜€ôµ¥¸¡‰…­½™˜€¨€È¸À°€ØÀ¸À¤(()‘•˜µ…¥¸ ¤€´ø¥¹Ðè(€€€Á…ÉÍ•È€ô…ÉÁ…ÉÍ”¹ÉÕµ•¹ÑA…ÉÍ•È¡‘•ÍÉ¥ÁÑ¥½¸ô‰]LÁÉ½‘ÕÑ¥½¸9½‘”•¹Ðˆ¤(€€€Á…ÉÍ•È¹…‘‘}…ÉÕµ•¹Ð ˆ´µ½¹”ˆ°…Ñ¥½¸ô‰ÍÑ½É•}ÑÉÕ”ˆ°¡•±Àô‰Á½±°½¹”…¹•á¥Ð¥˜¥‘±”ˆ¤(€€€Á…ÉÍ•È¹…‘‘}…ÉÕµ•¹Ð (€€€€€€€€ˆ´µ¡•…ÉÑ‰•…Ðµ½¹±äˆ°(€€€€€€€…Ñ¥½¸ô‰ÍÑ½É•}ÑÉÕ”ˆ°(€€€€€€€¡•±Àô‰µ…¥¹Ñ…¥¸…ÕÑ¡•¹Ñ¥…Ñ•Q%Y}%1ÁÉ•Í•¹”Ý¥Ñ¡½ÕÐ±…¥µ¥¹œÝ½É¬ˆ°(€€€€¤(€€€…ÉÌ€ôÁ…ÉÍ•È¹Á…ÉÍ•}…ÉÌ ¤(€€€½¹™¥œ€ôAÉ½‘ÕÑ¥½¹½¹™¥œ¹™É½µ}•¹Ø ¤(€€€Ý¥Ñ 9½‘••¹Ñ%¹ÍÑ…¹•1½¬¡½¹™¥œ¹Ý½É­ÍÁ…”¤è(€€€€€€€ÉÕ¹Ñ¥µ”€ôAÉ½‘ÕÑ¥½¹9½‘••¹ÑIÕ¹Ñ¥µ”¡½¹™¥œ¤(€€€€€€€¥˜…ÉÌ¹¡•…ÉÑ‰•…Ñ}½¹±äè(€€€€€€€€€€€ÉÕ¹Ñ¥µ”¹ÉÕ¹}¡•…ÉÑ‰•…Ñ}½¹±ä ¤(€€€€€€€€€€€É•ÑÕÉ¸€À(€€€€€€€¥˜¹½Ð…ÉÌ¹½¹”è(€€€€€€€€€€€ÉÕ¹Ñ¥µ”¹ÉÕ¹}™½É•Ù•È ¤(€€€€€€€€€€€É•ÑÕÉ¸€À(€€€€€€€ÉÕ¹Ñ¥µ”¹ÉÁŒ¹Ý½É­•É}Á¥¹œ ¤(€€€€€€€ÍÁ•Œ€ôÉÕ¹Ñ¥µ”¹ÉÁŒ¹±…¥´ ¤(€€€€€€€¥˜ÍÁ•Œ¥Ì9½¹”è(€€€€€€€€€€€É•ÑÕÉ¸€À(€€€€€€€¡…¹‘±”€ôÉÕ¹Ñ¥µ”¹}±…Õ¹ ¡)½ˆ¡ÍÁ•Œ¹Ñ…Í­}¥°ÍÁ•Œ¤¤(€€€€€€€Ý¡¥±”¹½Ð¡…¹‘±”¹‘½¹”è(€€€€€€€€€€€Ñ¥µ”¹Í±••À À¸È¤(€€€€€€€¥˜¡…¹‘±”¹•ÉÉ½È¥Ì¹½Ð9½¹”è(€€€€€€€€€€€É…¥Í”¡…¹‘±”¹•ÉÉ½È(€€€€€€€É•ÑÕÉ¸€À(()¥˜}}¹…µ•}|€ôô€‰}}µ…¥¹}|ˆè(€€€É…¥Í”MåÍÑ•µá¥Ð¡µ…¥¸ ¤¤(