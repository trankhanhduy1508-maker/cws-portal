"""Read-only preflight for the committed Eevee stress scene.

This checks the exact workload and reports whether the CWS staging adapter
configuration is present by variable name only. It never calls a backend,
Supabase, B2 or production and never prints secret values.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path


REQUIRED_STAGING_NAMES = (
    "CWS_STAGING_SUPABASE_URL", "CWS_STAGING_SUPABASE_KEY",
    "CWS_STAGING_B2_ENDPOINT", "CWS_STAGING_B2_KEY_ID",
    "CWS_STAGING_B2_APP_KEY", "CWS_STAGING_B2_BUCKET",
    "CWS_STAGING_B2_PREFIX", "CWS_STAGING_WORKER_ID", "CWS_STAGING_FLEET_ID",
)
EXPECTED_SCENE_SHA256 = "8ae22d0aa2a4131789c6d3e618266bd0ecfc4688d8363e4fa2c868ccd0f14ca0"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="CWS staging Eevee stress preflight")
    parser.add_argument("--scene", type=Path, required=True)
    parser.add_argument("--blender", type=Path, required=True)
    parser.add_argument("--manifest-out", type=Path,
                        default=Path("tests/fixtures/cws_eevee_stress_staging_manifest.json"))
    args = parser.parse_args()

    result: dict = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "scene": str(args.scene.resolve()), "expected_frames": [1, 48],
        "expected_resolution": "1280x720", "expected_engine": "BLENDER_EEVEE",
        "output_format": "png", "autoexec": False,
    }
    failures: list[str] = []
    if not args.scene.is_file() or args.scene.suffix.lower() != ".blend":
        failures.append("scene_missing_or_not_blend")
    else:
        digest = sha256(args.scene)
        result["scene_sha256"] = digest
        result["scene_bytes"] = args.scene.stat().st_size
        if digest != EXPECTED_SCENE_SHA256:
            failures.append("scene_sha256_mismatch")
    if not args.blender.is_file():
        failures.append("blender_missing")
    else:
        version = subprocess.run([str(args.blender), "-b", "--version"],
                                 capture_output=True, text=True, timeout=30)
        result["blender_version"] = (version.stdout or version.stderr).splitlines()[0] if version.returncode == 0 else "unavailable"
        if version.returncode != 0 or "Blender 5.2" not in result["blender_version"]:
            failures.append("blender_version_not_5_2")
    missing = [name for name in REQUIRED_STAGING_NAMES if not os.environ.get(name, "").strip()]
    result["staging_env_missing"] = missing
    result["staging_runtime_ready"] = not failures and not missing
    result["failures"] = failures
    args.manifest_out.parent.mkdir(parents=True, exist_ok=True)
    args.manifest_out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"scene_sha256": result.get("scene_sha256"),
                      "scene_bytes": result.get("scene_bytes"),
                      "blender_version": result.get("blender_version"),
                      "staging_env_missing": missing,
                      "staging_runtime_ready": result["staging_runtime_ready"],
                      "failures": failures}, indent=2))
    return 0 if result["staging_runtime_ready"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
