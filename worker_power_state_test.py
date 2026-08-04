from cws_worker_power_state import PowerState, transition

def test_nominal_cycle():
    state = PowerState.IDLE_LOW_POWER
    for target in (PowerState.WAKE_REQUESTED, PowerState.WAKING, PowerState.READY,
                   PowerState.RENDERING, PowerState.CLEANUP, PowerState.IDLE_LOW_POWER):
        state = transition(state, target)
    assert state is PowerState.IDLE_LOW_POWER

def test_invalid_transition_fails_closed():
    try:
        transition(PowerState.IDLE_LOW_POWER, PowerState.RENDERING)
    except ValueError:
        return
    raise AssertionError("invalid transition accepted")
