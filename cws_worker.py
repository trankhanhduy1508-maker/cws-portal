"""CWS Worker entrypoint for the Render -> Supabase task workflow.

Render is the CWS control plane. It creates internal jobs/tasks in Supabase;
this process claims those tasks, renders them, and uploads results to B2.
The implementation remains in cws_worker_runtime.py so the entrypoint is
small, testable, and safe to replace without changing the task contract.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import runpy
import sys


RUNTIME_NAME = "cws_worker_runtime.py"
REQUIRED_ENV = ("CWS_SUPABASE_KEY", "CWS_B2_KEY_ID", "CWS_B2_APP_KEY")
REQUIRED_MODULES = ("requests", "boto3", "PIL")
MANIFEST_NAME = "worker-artifact-manifest.json"


def verify_manifest() -> int:
    """Verify pinned package hashes without importing the runtime."""
    manifest_path = Path(__file__).with_name(MANIFEST_NAME)
    if not manifest_path.is_file():
        print(f"[manifest] ERROR: missing {manifest_path.name}")
        return 1
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        files = manifest["files"]
        expected_version = manifest["worker_version"]
        if expected_version != "1.18.0":
            raise ValueError("manifest worker_version khong khop runtime package")
        for relative_name, expected_hash in files.items():
            target = manifest_path.parent / relative_name
            if not target.is_file():
                raise ValueError(f"missing artifact: {relative_name}")
            digest = hashlib.sha256(target.read_bytes()).hexdigest().upper()
            if digest != str(expected_hash).upper():
                raise ValueError(f"checksum mismatch: {relative_name}")
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"[manifest] ERROR: {error}")
        return 1
    print("[manifest] PASS: pinned Worker artifact checksums verified")
    return 0


def preflight() -> int:
    """Validate the local package without claiming or modifying any task."""
    errors: list[str] = []
    runtime = Path(__file__).with_name(RUNTIME_NAME)
    if not runtime.is_file() or runtime.stat().st_size < 10_000:
        errors.append(f"missing or invalid runtime: {runtime}")

    for name in REQUIRED_ENV:
        if not os.environ.get(name):
            errors.append(f"missing environment variable: {name}")

    for module in REQUIRED_MODULES:
        if importlib.util.find_spec(module) is None:
            errors.append(f"missing Python dependency: {module}")

    if errors:
        for error in errors:
            print(f"[preflight] ERROR: {error}")
        return 1

    print("[preflight] OK: Render/Supabase task workflow package is ready")
    print(f"[preflight] runtime: {runtime.name} ({runtime.stat().st_size} bytes)")
    print("[preflight] credentials: present (values intentionally not displayed)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="CWS Render workflow worker")
    parser.add_argument(
        "--preflight",
        action="store_true",
        help="validate package and dependencies without contacting production",
    )
    parser.add_argument(
        "--verify-manifest",
        action="store_true",
        help="verify pinned package checksums without contacting production",
    )
    args = parser.parse_args()

    if args.verify_manifest and verify_manifest():
        return 1
    if args.verify_manifest and not args.preflight:
        return 0
    if args.preflight:
        return preflight()

    result = preflight()
    if result:
        return result

    runtime = Path(__file__).with_name(RUNTIME_NAME)
    runpy.run_path(str(runtime), run_name="__main__")
    return 0


if __name__ == "__main__":
    sys.exit(main())
