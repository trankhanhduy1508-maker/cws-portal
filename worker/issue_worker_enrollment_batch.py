"""Issue a bounded batch of one-time Worker tickets through Admin AAL2.

The AAL2 access token and returned tickets are read/written as files and never
printed. This tool replaces per-Worker SQL edits and supports batches up to the
Architecture V1 target of 100 Workers.
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import urllib.error
import urllib.request
from pathlib import Path

WORKER_ID = re.compile(r"^[A-Za-z0-9._~-]{1,128}$")


def read_worker_ids(path: Path) -> list[str]:
    values = [line.strip() for line in path.read_text(encoding="utf-8").splitlines()]
    ids = [value for value in values if value and not value.startswith("#")]
    if not 1 <= len(ids) <= 100 or len(set(ids)) != len(ids):
        raise ValueError("worker ID list must contain 1-100 unique entries")
    if any(not WORKER_ID.fullmatch(worker_id) for worker_id in ids):
        raise ValueError("worker ID list contains an invalid entry")
    return ids


def issue(*, backend_url: str, bearer: str, worker_ids: list[str], fleet_id: int) -> dict:
    base = backend_url.strip().rstrip("/")
    if not base.startswith("https://"):
        raise ValueError("production enrollment requires an HTTPS Backend URL")
    request = urllib.request.Request(
        f"{base}/worker/enrollment/tickets",
        data=json.dumps({"workerIds": worker_ids, "fleetId": fleet_id}).encode("utf-8"),
        headers={"Authorization": f"Bearer {bearer}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(
            request, timeout=30, context=ssl.create_default_context()
        ) as response:
            if response.status != 201:
                raise RuntimeError("Backend rejected enrollment batch")
            return json.loads(response.read(128 * 1024).decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError("Worker enrollment batch request failed") from exc


def main() -> int:
    parser = argparse.ArgumentParser(description="Issue CWS Worker enrollment tickets")
    parser.add_argument("--backend-url", required=True)
    parser.add_argument("--aal2-token-file", type=Path, required=True)
    parser.add_argument("--worker-ids-file", type=Path, required=True)
    parser.add_argument("--output-directory", type=Path, required=True)
    parser.add_argument("--fleet-id", type=int, default=2)
    args = parser.parse_args()
    if args.fleet_id < 1:
        parser.error("fleet ID must be positive")

    worker_ids = read_worker_ids(args.worker_ids_file)
    bearer = args.aal2_token_file.read_text(encoding="ascii").strip()
    if not bearer:
        raise RuntimeError("Admin AAL2 token file is empty")
    result = issue(
        backend_url=args.backend_url,
        bearer=bearer,
        worker_ids=worker_ids,
        fleet_id=args.fleet_id,
    )
    tickets = result.get("tickets")
    if not isinstance(tickets, list) or len(tickets) != len(worker_ids):
        raise RuntimeError("Backend returned an invalid enrollment batch")
    args.output_directory.mkdir(parents=True, exist_ok=True)
    for item in tickets:
        worker_id = item.get("workerId")
        token = item.get("token")
        if worker_id not in worker_ids or not isinstance(token, str):
            raise RuntimeError("Backend returned an invalid enrollment ticket")
        (args.output_directory / f"{worker_id}.ticket").write_text(token, encoding="ascii")
    print(f"Wrote {len(tickets)} short-lived Worker ticket files to {args.output_directory}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
