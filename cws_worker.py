"""CWS Worker entrypoint for the Render -> Supabase task workflow.

Render is the CWS control plane. It creates internal jobs/tasks in Supabase;
this process claims those tasks, renders them, and uploads results to B2.
The implementation remains in cws_worker_runtime.py so the entrypoint is
small, testable, and safe to replace without changing the task contract.
"""

from __future__ import annotations

import argparse
import importlib.util
import os
from pathlib import Path
import runpy
import sys

RUNTIME_NAME = "cws_worker_runtime.py"
REQUIRED_ENV = ("CWS_SUPABASE_KEY", "CWS_B2_KEY_ID", "CWS_B2_APP_KEY")
REQUIRED_MODULES = ("requests", "boto3", "PIL")


def preflight() -> int:
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
    parser.add_argument("--preflight", action="store_true")
    args = parser.parse_args()
    if args.preflight:
        return preflight()
    result = preflight()
    if result:
        return result
    runpy.run_path(str(Path(__file__).with_name(RUNTIME_NAME)), run_name="__main__")
    return 0


if __name__ == "__main__":
    sys.exit(main())
