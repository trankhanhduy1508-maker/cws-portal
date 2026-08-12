"""Minimum-necessary normalized composite machine evidence.

This hash is enrollment/recovery evidence only. It is never a Worker ID.
"""
from __future__ import annotations

import hashlib
import platform
import re
from pathlib import Path


def normalize_signal(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def machine_guid() -> str:
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as key:
            return str(winreg.QueryValueEx(key, "MachineGuid")[0])
    except (ImportError, OSError):
        return ""


def composite_fingerprint_hash() -> str:
    signals = {
        "machine_guid": normalize_signal(machine_guid()),
        "system": normalize_signal(platform.platform()),
        "machine": normalize_signal(platform.machine()),
        "processor": normalize_signal(platform.processor()),
        "node": normalize_signal(platform.node()),
    }
    canonical = "|".join(f"{key}={signals[key]}" for key in sorted(signals))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
