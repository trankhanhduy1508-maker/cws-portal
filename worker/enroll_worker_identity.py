"""Automatically provision and redeem one Worker enrollment on Windows.

The final per-Worker credential is generated locally, protected with DPAPI and
never returned to Backend in plaintext. The site bootstrap capability is
deleted only after a successful, idempotent redemption. The Backend, never the
operator, selects the canonical Worker ID.
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
)
from machine_fingerprint import composite_fingerprint_hash
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
    fingerprint_hash: str,
    timeout_seconds: int,
) -> str:
    payload = {
        "token": enrollment_token,
        "workerId": worker_id,
        "credentialHash": credential_hash(final_credential),
        "fingerprintHash": fingerprint_hash,
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
    parser.add_argument("--bootstrap-token-file", type=Path, required=True)
    parser.add_argument("--store", type=Path, required=True)
    parser.add_argument("--hostname", default=platform.node())
    parser.add_argument("--gpu-name")
    parser.add_argument("--vram-mb", type=int, default=0)
    parser.add_argument("--timeout-seconds", type=int, default=30)
    args = parser.parse_args()
    if args.vram_mb < 0 or not 5 <= args.timeout_seconds <= 120:
        parser.error("invalid enrollment bounds")

    bootstrap = args.bootstrap_token_file.read_text(encoding="ascii").strip()
    if not bootstrap:
        raise RuntimeError("site bootstrap capability is empty")
    fingerprint_hash = composite_fingerprint_hash()
    provision_request = urllib.request.Request(
        enrollment_url(args.backend_url).removesuffix("/redeem") + "/provision",
        data=json.dumps({
            "bootstrapToken": bootstrap,
            "fingerprintHash": fingerprint_hash,
            "hostname": args.hostname,
            "gpuName": args.gpu_name,
            "vramMb": args.vram_mb,
        }, separators=(",", ":")).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(provision_request, timeout=args.timeout_seconds, context=ssl.create_default_context()) as response:
            if response.status != 201:
                raise RuntimeError("Backend rejected Worker provisioning")
            provisioned = json.loads(response.read(4096).decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError("Worker provisioning request failed") from exc
    worker_id = provisioned.get("workerId")
    ticket = provisioned.get("token")
    if not isinstance(worker_id, str) or not isinstance(ticket, str):
        raise RuntimeError("Backend returned invalid Worker provisioning material")

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
        fingerprint_hash=fingerprint_hash,
        timeout_seconds=args.timeout_seconds,
    )
    WindowsProtectedCredentialStore(args.store).save(final_credential)
    pending_path.unlink(missing_ok=True)
    args.bootstrap_token_file.unlink(missing_ok=True)
    print(f"Enrolled CWS Worker: {worker_id}")
    print(f"DPAPI credential store: {args.store}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
