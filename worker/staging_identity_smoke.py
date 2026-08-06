"""Credential-gated staging smoke test for the Worker identity gateway.

Refuses known production hosts and never prints an auth header or token.
"""
from __future__ import annotations

import argparse
from pathlib import Path
from urllib.parse import urlparse

from windows_credential_store import WindowsProtectedCredentialStore
from worker_rpc_auth import WorkerCredential, WorkerRpcClient

PRODUCTION_HOSTS = {"cws-portal.vercel.app", "cws-portal.onrender.com"}


def main() -> int:
    parser = argparse.ArgumentParser(description="CWS staging Worker identity smoke test")
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--worker-id", required=True)
    parser.add_argument("--credential-store", type=Path, required=True)
    parser.add_argument("--claim", action="store_true")
    parser.add_argument("--vram-mb", type=int, default=0)
    args = parser.parse_args()
    parsed = urlparse(args.base_url)
    if parsed.scheme != "https" or parsed.hostname in PRODUCTION_HOSTS:
        parser.error("staging smoke requires an HTTPS non-production endpoint")
    if args.vram_mb < 0:
        parser.error("--vram-mb must be non-negative")
    token = WindowsProtectedCredentialStore(args.credential_store).load()
    client = WorkerRpcClient(args.base_url, WorkerCredential(args.worker_id, token))
    client.call("worker_ping", {})
    print("authenticated worker_ping: PASS")
    if args.claim:
        result = client.call("claim_next_resilient_task", {"p_worker_vram_mb": args.vram_mb})
        print(f"resilient claim RPC: PASS (result_present={bool(result)})")
    print("credential was loaded from DPAPI and was not printed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
