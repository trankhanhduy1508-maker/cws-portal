"""Best-effort, non-secret host capability discovery.

Discovery is diagnostic/admission input only. Unknown values remain unknown;
the Node Engine never invents hardware capabilities or changes backend state
from this module.
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class HostCapabilities:
    hostname: str
    os_name: str
    os_version: str
    cpu_count: int | None
    ram_mb: int | None
    disk_free_mb: int | None
    gpu_name: str | None
    vram_mb: int | None
    nvidia_driver: str | None
    cuda_available: bool | None
    blender_version: str | None
    blender_available: bool

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def _nvidia() -> tuple[str | None, int | None, str | None, bool | None]:
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,driver_version",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None, None, None, None
    if result.returncode != 0 or not result.stdout.strip():
        return None, None, None, False
    fields = [part.strip() for part in result.stdout.splitlines()[0].split(",")]
    if len(fields) != 3:
        return None, None, None, False
    try:
        vram = int(float(fields[1]))
    except ValueError:
        vram = None
    return fields[0] or None, vram, fields[2] or None, True


def _blender_version(executable: Path | None) -> tuple[bool, str | None]:
    if executable is None or not executable.is_file():
        return False, None
    try:
        result = subprocess.run(
            [str(executable), "--version"],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False, None
    first_line = next((line.strip() for line in result.stdout.splitlines() if line.strip()), None)
    return result.returncode == 0, first_line


def discover_host_capabilities(
    blender_executable: Path | None = None,
    workspace: Path | None = None,
) -> HostCapabilities:
    """Collect only local metadata required for readiness and diagnostics."""
    gpu_name, vram_mb, driver, cuda = _nvidia()
    blender_available, blender_version = _blender_version(blender_executable)
    disk_free_mb: int | None = None
    if workspace is not None:
        try:
            disk_free_mb = shutil.disk_usage(workspace).free // (1024 * 1024)
        except OSError:
            disk_free_mb = None
    ram_mb: int | None = None
    try:
        import psutil  # type: ignore

        ram_mb = int(psutil.virtual_memory().total // (1024 * 1024))
    except (ImportError, OSError, ValueError):
        pass
    return HostCapabilities(
        hostname=platform.node() or "unknown",
        os_name=platform.system() or os.name,
        os_version=platform.version() or "unknown",
        cpu_count=os.cpu_count(),
        ram_mb=ram_mb,
        disk_free_mb=disk_free_mb,
        gpu_name=gpu_name,
        vram_mb=vram_mb,
        nvidia_driver=driver,
        cuda_available=cuda,
        blender_version=blender_version,
        blender_available=blender_available,
    )
