"""Fail-closed local readiness evaluation for the Node Engine."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .capabilities import HostCapabilities


@dataclass(frozen=True)
class ReadinessResult:
    ready: bool
    checks: dict[str, bool]
    reasons: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "ready": self.ready,
            "checks": dict(self.checks),
            "reasons": list(self.reasons),
        }


def evaluate_readiness(
    *,
    backend_url: str,
    worker_id: str,
    credential_file: Path,
    workspace: Path,
    capabilities: HostCapabilities,
    minimum_disk_free_mb: int = 256,
) -> ReadinessResult:
    checks = {
        "backend_https": backend_url.startswith("https://"),
        "worker_id": bool(worker_id),
        "credential_file": credential_file.is_file(),
        "workspace": workspace.is_dir(),
        "disk": capabilities.disk_free_mb is not None
        and capabilities.disk_free_mb >= minimum_disk_free_mb,
        "blender": capabilities.blender_available,
    }
    reasons = tuple(name for name, passed in checks.items() if not passed)
    return ReadinessResult(not reasons, checks, reasons)
