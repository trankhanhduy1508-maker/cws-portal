"""Deterministic local readiness checks for the production Node Agent.

This module deliberately performs no network calls and never changes CWS
control-plane state. It reports only facts that can be observed locally.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class HostCapabilities:
    """Locally observed runtime facts; unknown hardware is never fabricated."""

    blender_executable: str
    blender_present: bool
    workspace_present: bool
    workspace_writable: bool

    def as_dict(self) -> dict[str, Any]:
        return {
            "blender_executable": self.blender_executable,
            "blender_present": self.blender_present,
            "workspace_present": self.workspace_present,
            "workspace_writable": self.workspace_writable,
        }


@dataclass(frozen=True)
class Readiness:
    """Fail-closed result for local Node Agent startup checks."""

    ready: bool
    reasons: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        return {"ready": self.ready, "reasons": list(self.reasons)}


def _workspace_writable(workspace: Path) -> bool:
    if not workspace.is_dir():
        return False
    try:
        return os.access(workspace, os.W_OK)
    except OSError:
        return False


def discover_host_capabilities(
    blender_exe: str | Path,
    workspace: str | Path,
) -> HostCapabilities:
    """Inspect Blender/workspace availability without starting any process."""

    blender_path = Path(blender_exe).expanduser()
    workspace_path = Path(workspace).expanduser()
    return HostCapabilities(
        blender_executable=str(blender_path),
        blender_present=blender_path.is_file(),
        workspace_present=workspace_path.is_dir(),
        workspace_writable=_workspace_writable(workspace_path),
    )


def evaluate_readiness(
    *,
    backend_url: str,
    worker_id: str,
    credential_file: str | Path,
    workspace: str | Path,
    capabilities: HostCapabilities,
) -> Readiness:
    """Return readiness from local/configuration facts only.

    Backend reachability and credential validity are intentionally not inferred
    here. The authenticated RPC health probe remains responsible for proving
    those runtime properties.
    """

    reasons: list[str] = []
    if not backend_url.startswith("https://"):
        reasons.append("backend_url_must_use_https")
    if not worker_id.strip():
        reasons.append("worker_id_missing")

    credential_path = Path(credential_file).expanduser()
    if not credential_path.is_file():
        reasons.append("credential_file_missing")
    if not capabilities.blender_present:
        reasons.append("blender_missing")
    if not capabilities.workspace_present:
        reasons.append("workspace_missing")
    elif not capabilities.workspace_writable:
        reasons.append("workspace_not_writable")

    return Readiness(ready=not reasons, reasons=tuple(reasons))
