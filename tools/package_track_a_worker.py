#!/usr/bin/env python3
"""Build the versioned Track A Worker + rented-machine Guard release bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = (
    "cws_worker_full.py",
    "worker/rented_machine_guard.py",
    "worker/rented_machine_guard_policy.json",
)
VERSION_RE = re.compile(r'^WORKER_VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"$', re.MULTILINE)


def build_bundle(output: Path) -> dict[str, object]:
    worker_source = (ROOT / REQUIRED_FILES[0]).read_text(encoding="utf-8")
    match = VERSION_RE.search(worker_source)
    if match is None:
        raise RuntimeError("WORKER_VERSION was not found in cws_worker_full.py")

    hashes: dict[str, str] = {}
    for relative in REQUIRED_FILES:
        payload = (ROOT / relative).read_bytes()
        if not payload:
            raise RuntimeError(f"required release file is empty: {relative}")
        hashes[relative] = hashlib.sha256(payload).hexdigest()

    manifest: dict[str, object] = {"version": match.group(1), "files": hashes}
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix(output.suffix + ".tmp")
    temp.unlink(missing_ok=True)
    try:
        with zipfile.ZipFile(temp, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for relative in REQUIRED_FILES:
                archive.write(ROOT / relative, relative)
            archive.writestr(
                "worker_bundle_manifest.json",
                json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            )
        temp.replace(output)
    finally:
        temp.unlink(missing_ok=True)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "dist" / "cws_worker_bundle.zip",
        help="bundle destination (default: dist/cws_worker_bundle.zip)",
    )
    args = parser.parse_args()
    manifest = build_bundle(args.output)
    print(json.dumps({"output": str(args.output.resolve()), **manifest}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
