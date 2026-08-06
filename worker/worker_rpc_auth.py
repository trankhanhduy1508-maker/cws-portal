"""Production Worker RPC authentication client.

The credential is per Worker and must be loaded from the Windows-protected
credential store by the caller. This module never logs or persists it.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any, Mapping


def canonical_request(worker_id: str, timestamp: str, nonce: str,
                      method: str, path: str, body: bytes) -> bytes:
    body_hash = hashlib.sha256(body).hexdigest()
    return "\n".join((worker_id, timestamp, nonce, method.upper(), path, body_hash)).encode("utf-8")


@dataclass(frozen=True)
class WorkerCredential:
    worker_id: str
    token: str


def build_auth_headers(credential: WorkerCredential, method: str, path: str,
                       body: bytes, now_seconds: int | None = None,
                       nonce: str | None = None) -> dict[str, str]:
    timestamp = str(int(time.time() if now_seconds is None else now_seconds))
    chosen_nonce = nonce or uuid.uuid4().hex
    signature = hmac.new(
        credential.token.encode("ascii"),
        canonical_request(credential.worker_id, timestamp, chosen_nonce, method, path, body),
        hashlib.sha256,
    ).hexdigest()
    return {
        "Authorization": f"Worker {credential.token}",
        "X-CWS-Worker-Id": credential.worker_id,
        "X-CWS-Worker-Timestamp": timestamp,
        "X-CWS-Worker-Nonce": chosen_nonce,
        "X-CWS-Worker-Signature": signature,
    }


class WorkerRpcClient:
    """Allowlisted backend gateway client; never calls Supabase directly."""

    def __init__(self, base_url: str, credential: WorkerCredential, timeout: int = 20):
        if not base_url.startswith("https://"):
            raise ValueError("production Worker RPC requires https://")
        self.base_url = base_url.rstrip("/")
        self.credential = credential
        self.timeout = timeout

    def call(self, operation: str, payload: Mapping[str, Any]) -> Any:
        path = f"/worker/rpc/{operation}"
        body = json.dumps(dict(payload), separators=(",", ":"), sort_keys=True).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}{path}", data=body, method="POST",
            headers={"Content-Type": "application/json",
                     **build_auth_headers(self.credential, "POST", path, body)},
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                raw = response.read()
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            raise RuntimeError("Worker RPC request failed") from exc
        return json.loads(raw.decode("utf-8")) if raw else None
