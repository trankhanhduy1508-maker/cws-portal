"""Safe Node Agent runtime policy hooks.

The default policy is deliberately side-effect free. Callers may inject
monitor callbacks, but this module never calls Sleep/Hibernate/shutdown or
Windows power APIs. ACTIVE_IDLE means the PC remains online.
"""

from typing import Callable, Optional
from node_agent import NodeState


class RuntimePolicy:
    def __init__(
        self,
        monitor_off: Optional[Callable[[], None]] = None,
        monitor_on: Optional[Callable[[], None]] = None,
    ):
        self.monitor_off = monitor_off or (lambda: None)
        self.monitor_on = monitor_on or (lambda: None)
        self.last_state: Optional[NodeState] = None

    def on_state(self, state: NodeState) -> None:
        if state is NodeState.ACTIVE_IDLE and self.last_state is not NodeState.ACTIVE_IDLE:
            self.monitor_off()
        elif state is not NodeState.ACTIVE_IDLE and self.last_state is NodeState.ACTIVE_IDLE:
            self.monitor_on()
        self.last_state = state
