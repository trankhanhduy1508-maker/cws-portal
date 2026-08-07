"""Best-effort, non-secret host metrics for a render attempt.

Metrics are diagnostic only. They never affect scheduling, completion, or
payment state, and collection failure is intentionally ignored.
"""

from __future__ import annotations

import os
import subprocess
from typing import Any


def collect_host_metrics(pid: int | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {"pid": pid, "cpu_percent": None, "ram_mb": None, "gpu": []}
    try:
        import psutil  # type: ignore

        result["cpu_percent"] = psutil.cpu_percent(interval=None)
        result["ram_mb"] = round(psutil.virtual_memory().used / (1024 * 1024), 1)
        if pid and psutil.pid_exists(pid):
            process = psutil.Process(pid)
            result["process_cpu_percent"] = process.cpu_percent(interval=None)
            result["process_ram_mb"] = round(process.memory_info().rss / (1024 * 1024), 1)
    except (ImportError, OSError, ValueError):
        pass

    try:
        completed = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=index,utilization.gpu,memory.used,memory.total",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if completed.returncode == 0:
            for line in completed.stdout.splitlines():
                fields = [field.strip() for field in line.split(",")]
                if len(fields) == 4:
                    result["gpu"].append(
                        {
                            "index": fields[0],
                            "utilization_percent": fields[1],
                            "memory_used_mb": fields[2],
                            "memory_total_mb": fields[3],
                        }
                    )
    except (OSError, subprocess.SubprocessError):
        pass
    return result
