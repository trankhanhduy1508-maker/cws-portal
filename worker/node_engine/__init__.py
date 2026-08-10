"""Control-plane primitives for the canonical CWS Windows Node Engine."""

from .capabilities import HostCapabilities, discover_host_capabilities
from .readiness import ReadinessResult, evaluate_readiness

__all__ = [
    "HostCapabilities",
    "ReadinessResult",
    "discover_host_capabilities",
    "evaluate_readiness",
]
