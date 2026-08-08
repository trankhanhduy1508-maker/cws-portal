"""Redeem one short-lived Backend enrollment ticket on a Windows Worker.

The final per-Worker credential is generated locally, protected with DPAPI and
never returned to Backend in plaintext. The enrollment ticket is deleted only
after a successful, idempotent redemption.
"""

from __future__ import annotations

import argparse
import json
import platform
import ssl
import urllib.error
import urllib.request
from pathlib import Path

from provision_worker_identity import (
    credential_hash,
    generate_token,
    stable_worker_id,
    windows_machine_guid,
)
from windows_credential_store import WindowsProtectedCredentialStore


def enrollment_url(backend_url: str) -> str:
    base = backend_url.strip().rstrip("/")
    if not base.startswith("https://"):
        raise ValueError("production enrollment requires an HTTPS Backend URL")
    return f"{base}/worker/enrollment/redeem"


def redeem(
    *,
    url: str,
    enrollment_token: str,
    worker_id: str,
    final_credential: str,
    hostname: str,
    gpu_name: str | None,
    vram_mb: int,
    timeout_seconds: int,
) -> str:
    payload = {
        "token": enrollment_token,
        "workerId": worker_id,
        "credentialHash": credential_hash(final_credential),
        "hostname": hostname,
        "gpuName": gpu_name,
        "vramMb": vram_mb,
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(
            request, timeout=timeout_seconds, context=ssl.create_default_context()
        ) as response:
            if response.status != 201:
                raise RuntimeError("Backend rejected Worker enrollment")
            result = json.loads(response.read(4096).decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError("Worker enrollment request failed") from exc
    if result.get("workerId") != worker_id:
        raise RuntimeError("Backend returned an invalid Worker identity")
    return worker_id


def main() -> int:
    parser = argparse.ArgumentParser(description="Enroll one CWS production Worker")
    parser.add_argument("--backend-url", required=True)
    parser.add_argument("--ticket-file", type=Path, required=True)
    parser.add_argument("--store", type=Path, required=True)
    parser.add_argument("--worker-id")
    parser.add_argument("--hostname", default=platform.node())
    parser.add_argument("--gpu-name")
    parser.add_argument("--vram-mb", type=int, default=0)
    parser.add_argument("--timeout-seconds", type=int, default=30)
    args = parser.parse_args()
    if args.vram_mb < 0 or not 5 <= args.timeout_seconds <= 120:
        parser.error("invalid enrollment bounds")

    worker_id = args.worker_id or stable_worker_id(windows_machine_guid())
    ticket = args.ticket_file.read_text(encoding="ascii").strip()
    if not ticket:
        raise RuntimeError("Worker enrollment ticket is empty")

    pending_path = args.store.with_suffix(args.store.suffix + ".pending")
    pending_store = WindowsProtectedCredentialStore(pending_path)
    if pending_path.exists():
        final_credential = pending_store.load()
    else:
        final_credential = generate_token()
        pending_store.save(final_credential)

    redeem(
        url=enrollment_url(args.backend_url),
        enrollment_token=ticket,
        worker_id=worker_id,
        final_credential=final_credential,
        hostname=args.hostname,
        gpu_name=args.gpu_name,
        vram_mb=args.vram_mb,
        timeout_seconds=args.timeout_seconds,
    )
    WindowsProtectedCredentialStore(args.store).save(final_credential)
    pending_path.unlink(missing_ok=True)
    args.ticket_file.unlink(missing_ok=True)
    print(f"Enrolled CWS Worker: {worker_id}")
    print(f"DPAPI credential store: {args.store}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
