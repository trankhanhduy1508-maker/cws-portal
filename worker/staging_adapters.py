"""Credential-gated Supabase/B2 adapters for the staging E2E harness.

This module is not used by the production frontend and has no production
fallbacks. Every secret is read from CWS_STAGING_* environment variables.
There are intentionally no delete, bucket-admin or key-admin methods.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from worker_engine import (CheckpointStore, JobSpec, PermanentWorkerError,
                           RetryableWorkerError)


@dataclass(frozen=True)
class StagingConfig:
    supabase_url: str
    supabase_key: str
    b2_endpoint: str
    b2_key_id: str
    b2_app_key: str
    b2_bucket: str
    worker_id: str
    fleet_id: str

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "StagingConfig":
        values = env or os.environ
        names = {
            "supabase_url": "CWS_STAGING_SUPABASE_URL",
            "supabase_key": "CWS_STAGING_SUPABASE_KEY",
            "b2_endpoint": "CWS_STAGING_B2_ENDPOINT",
            "b2_key_id": "CWS_STAGING_B2_KEY_ID",
            "b2_app_key": "CWS_STAGING_B2_APP_KEY",
            "b2_bucket": "CWS_STAGING_B2_BUCKET",
            "worker_id": "CWS_STAGING_WORKER_ID",
            "fleet_id": "CWS_STAGING_FLEET_ID",
        }
        missing = [name for name in names.values() if not values.get(name, "").strip()]
        if missing:
            raise PermanentWorkerError("missing staging configuration: " + ", ".join(missing))
        url = values[names["supabase_url"]].rstrip("/")
        endpoint = values[names["b2_endpoint"]].strip()
        if not re.fullmatch(r"https?://[^/]+", url):
            raise PermanentWorkerError("invalid staging Supabase URL")
        if endpoint.startswith("http://") or endpoint.startswith("https://"):
            endpoint = endpoint.split("://", 1)[1].rstrip("/")
        return cls(url, values[names["supabase_key"]], endpoint,
                   values[names["b2_key_id"]], values[names["b2_app_key"]],
                   values[names["b2_bucket"]], values[names["worker_id"]],
                   values[names["fleet_id"]])


class SupabaseStagingRpc:
    """Small REST RPC client; service_role is neither required nor accepted by name."""

    def __init__(self, config: StagingConfig, timeout: int = 20):
        self.config = config
        self.timeout = timeout

    def call(self, function: str, payload: Mapping[str, Any]) -> Any:
        body = json.dumps(dict(payload)).encode("utf-8")
        request = urllib.request.Request(
            f"{self.config.supabase_url}/rest/v1/rpc/{function}",
            data=body,
            method="POST",
            headers={"Content-Type": "application/json",
                     "apikey": self.config.supabase_key,
                     "Authorization": f"Bearer {self.config.supabase_key}"},
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                raw = response.read()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            raise RetryableWorkerError(f"staging Supabase RPC failed: {function}") from exc
        try:
            return json.loads(raw.decode("utf-8")) if raw else None
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise RetryableWorkerError("staging Supabase returned invalid JSON") from exc

    def register_worker(self, gpu_name: str | None, vram_mb: int) -> Any:
        return self.call("register_worker", {"p_worker_id": self.config.worker_id,
                                              "p_fleet_id": self.config.fleet_id,
                                              "p_gpu_name": gpu_name,
                                              "p_vram_mb": vram_mb})

    def worker_ping(self) -> Any:
        return self.call("worker_ping", {"p_worker_id": self.config.worker_id})

    def report_heartbeat(self, task_id: int, generation: int) -> bool:
        result = self.call("report_heartbeat", {"p_task_id": task_id,
                                                 "p_generation": generation,
                                                 "p_worker_id": self.config.worker_id})
        return result is True

    def claim_next(self, vram_mb: int) -> Any:
        return self.call("claim_next_generic_task", {"p_worker_id": self.config.worker_id,
                                                      "p_worker_vram_mb": vram_mb})

    def transition(self, state: str, task_id: int | None = None, reason: str | None = None) -> Any:
        return self.call("report_worker_state_transition", {
            "p_worker_id": self.config.worker_id, "p_to_state": state,
            "p_task_id": task_id, "p_reason": reason,
        })

    def complete(self, task_id: int, generation: int) -> bool:
        return self.call("complete_task", {"p_task_id": task_id,
                                           "p_generation": generation,
                                           "p_worker_id": self.config.worker_id}) is True

    def fail(self, task_id: int, generation: int, error_type: str) -> Any:
        return self.call("fail_task", {"p_task_id": task_id,
                                        "p_generation": generation,
                                        "p_worker_id": self.config.worker_id,
                                        "p_error_type": error_type})


class B2StagingCheckpointStore(CheckpointStore):
    """S3-compatible B2 frame checkpoint store with frame-level idempotency."""

    def __init__(self, config: StagingConfig, prefix: str):
        try:
            import boto3
            from botocore.exceptions import ClientError
        except ImportError as exc:
            raise PermanentWorkerError("boto3 is required for B2 staging") from exc
        self._client_error = ClientError
        self.client = boto3.client("s3", endpoint_url=f"https://{config.b2_endpoint}",
                                   aws_access_key_id=config.b2_key_id,
                                   aws_secret_access_key=config.b2_app_key)
        self.bucket = config.b2_bucket
        self.prefix = prefix.strip("/")

    def _key(self, spec: JobSpec, frame: int, suffix: str = "") -> str:
        return f"{self.prefix}/{spec.task_id}/frame_{frame:04d}.{spec.output_format}{suffix}"

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def _head(self, key: str) -> Mapping[str, Any] | None:
        try:
            return self.client.head_object(Bucket=self.bucket, Key=key)
        except self._client_error as exc:
            code = str(exc.response.get("Error", {}).get("Code", ""))
            if code in {"404", "NoSuchKey", "NotFound"}:
                return None
            raise RetryableWorkerError("B2 staging HEAD failed") from exc

    def is_verified(self, spec: JobSpec, frame: int) -> bool:
        key = self._key(spec, frame)
        head = self._head(key)
        if not head or head.get("Metadata", {}).get("sha256") is None:
            return False
        metadata = head["Metadata"]
        # A prior successful verify records the content hash as object
        # metadata. The local output is checked again in verify() before the
        # attempt is considered complete.
        return (metadata.get("job_id") == spec.job_id and
                metadata.get("task_id") == spec.task_id and
                metadata.get("frame") == str(frame) and
                bool(metadata.get("sha256")))

    def put(self, spec: JobSpec, frame: int, output: Path) -> None:
        if self.is_verified(spec, frame):
            return
        digest = self._sha256(output)
        try:
            self.client.upload_file(str(output), self.bucket, self._key(spec, frame),
                                    ExtraArgs={"Metadata": {"job_id": spec.job_id,
                                                              "task_id": spec.task_id,
                                                              "frame": str(frame),
                                                              "sha256": digest}})
        except Exception as exc:
            raise RetryableWorkerError("B2 staging upload failed") from exc

    def verify(self, spec: JobSpec, frame: int, output: Path) -> None:
        head = self._head(self._key(spec, frame))
        if not head or head.get("Metadata", {}).get("sha256") != self._sha256(output):
            raise RetryableWorkerError(f"B2 staging checkpoint verification failed for frame {frame}")
