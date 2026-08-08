"""Small, deterministic resilience policy shared by the CWS Worker runtime.

This module is deliberately independent of OmniRoute and of the scheduler.
It only classifies failure boundaries and calculates bounded operation/backoff
delays. Task ownership remains in PostgreSQL lease/generation fencing.
"""

from __future__ import annotations

import hashlib
from enum import Enum


class FailureCategory(str, Enum):
    CUSTOMER_INPUT_ERROR = "CUSTOMER_INPUT_ERROR"
    CAPABILITY_MISMATCH = "CAPABILITY_MISMATCH"
    BLENDER_RENDER_ERROR = "BLENDER_RENDER_ERROR"
    WORKER_HOST_ERROR = "WORKER_HOST_ERROR"
    STORAGE_TRANSIENT = "STORAGE_TRANSIENT"
    BACKEND_TRANSIENT = "BACKEND_TRANSIENT"
    NETWORK_TRANSIENT = "NETWORK_TRANSIENT"
    SECURITY_VIOLATION = "SECURITY_VIOLATION"

    # Compatibility aliases for the pre-taxonomy WorkerEngine tests/callers.
    PERMANENT = CUSTOMER_INPUT_ERROR
    RETRYABLE = BLENDER_RENDER_ERROR


def _category(value: FailureCategory | str) -> FailureCategory:
    if isinstance(value, FailureCategory):
        return value
    try:
        return FailureCategory(str(value).upper())
    except ValueError:
        return FailureCategory.NETWORK_TRANSIENT


def task_retryable(value: FailureCategory | str) -> bool:
    """Whether the task may use the existing bounded backend failover budget."""
    return _category(value) in {
        FailureCategory.CAPABILITY_MISMATCH,
        FailureCategory.BLENDER_RENDER_ERROR,
        FailureCategory.WORKER_HOST_ERROR,
        FailureCategory.STORAGE_TRANSIENT,
        FailureCategory.BACKEND_TRANSIENT,
        FailureCategory.NETWORK_TRANSIENT,
    }


def penalizes_worker(value: FailureCategory | str) -> bool:
    """Only worker-local host/render failures affect health scoring."""
    return _category(value) in {
        FailureCategory.BLENDER_RENDER_ERROR,
        FailureCategory.WORKER_HOST_ERROR,
    }


def fails_closed(value: FailureCategory | str) -> bool:
    return _category(value) is FailureCategory.SECURITY_VIOLATION


def stable_jitter_value(seed: str, attempt: int) -> float:
    """Return a deterministic value in [0, 1) for a Worker/operation pair."""
    if attempt < 1:
        raise ValueError("attempt must be positive")
    digest = hashlib.sha256(f"{seed}:{attempt}".encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") / float(1 << 64)


def bounded_exponential_backoff(
    base_seconds: float,
    attempt: int,
    cap_seconds: float,
    *,
    jitter_ratio: float = 0.25,
    jitter_value: float | None = None,
) -> float:
    """Calculate bounded exponential delay with additive jitter.

    ``attempt`` is one-based. Jitter is deterministic when ``jitter_value`` is
    supplied by the caller; no global random source is used by this policy.
    """
    if base_seconds < 0 or cap_seconds < 0 or base_seconds > cap_seconds:
        raise ValueError("invalid backoff bounds")
    if attempt < 1:
        raise ValueError("attempt must be positive")
    if not 0 <= jitter_ratio <= 1:
        raise ValueError("jitter_ratio must be between 0 and 1")
    if jitter_value is not None and not 0 <= jitter_value <= 1:
        raise ValueError("jitter_value must be between 0 and 1")
    raw = min(cap_seconds, base_seconds * (2 ** (attempt - 1)))
    if jitter_ratio == 0 or jitter_value is None:
        return raw
    return min(cap_seconds, raw * (1 + jitter_ratio * jitter_value))

