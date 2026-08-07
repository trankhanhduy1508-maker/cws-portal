"""Safe Node Agent runtime policy hooks.

The default policy is deliberately side-effect free. Callers may inject
monitor callbacks, but this module never calls Sleep/Hibernate/shutdown or
Windows power APIs. ACTIVE_IDLE means the PC remains online.
"""

from typing import Callable, Optional, Any


class RuntimePolicy:
    def __init__(
        self,
        monitor_off: Optional[Callable[[], None]] = None,
        monitor_on: Optional[Callable[[], None]] = None,
        state_observer: Optional[Callable[[Any], None]] = None,
    ):
        self.monitor_off = monitor_off or (lambda: None)
        self.monitor_on = monitor_on or (lambda: None)
        self.state_observer = state_observer or (lambda _state: None)
        self.last_state: Optional[Any] = None

    def on_state(self, state: Any) -> None:
        state_value = getattr(state, "value", state)
        last_value = getattr(self.last_state, "value", self.last_state)
        if state_value == "ACTIVE_IDLE" and last_value != "ACTIVE_IDLE":
            self.monitor_off()
        elif state_value != "ACTIVE_IDLE" and last_value == "ACTIVE_IDLE":
            self.monitor_on()
        self.last_state = state
        self.state_observer(state)
