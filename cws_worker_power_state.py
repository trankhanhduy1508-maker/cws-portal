"""Pure Worker power-policy state machine.

No Windows API calls, sleep, wake, or power configuration are performed here.
"""
from enum import Enum


class PowerState(str, Enum):
    IDLE_LOW_POWER = "IDLE_LOW_POWER"
    WAKE_REQUESTED = "WAKE_REQUESTED"
    WAKING = "WAKING"
    READY = "READY"
    RENDERING = "RENDERING"
    CLEANUP = "CLEANUP"


_TRANSITIONS = {
    PowerState.IDLE_LOW_POWER: {PowerState.WAKE_REQUESTED},
    PowerState.WAKE_REQUESTED: {PowerState.WAKING, PowerState.IDLE_LOW_POWER},
    PowerState.WAKING: {PowerState.READY, PowerState.IDLE_LOW_POWER},
    PowerState.READY: {PowerState.RENDERING, PowerState.IDLE_LOW_POWER},
    PowerState.RENDERING: {PowerState.CLEANUP, PowerState.IDLE_LOW_POWER},
    PowerState.CLEANUP: {PowerState.READY, PowerState.IDLE_LOW_POWER},
}


def transition(current: PowerState, target: PowerState) -> PowerState:
    current = PowerState(current)
    target = PowerState(target)
    if target not in _TRANSITIONS[current]:
        raise ValueError(f"invalid power transition: {current.value} -> {target.value}")
    return target
