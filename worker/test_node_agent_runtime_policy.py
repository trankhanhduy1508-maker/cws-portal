import unittest

from node_agent import Job, NodeAgent, NodeState, WorkerResult
from node_agent_runtime_policy import RuntimePolicy


class NodeAgentRuntimePolicyTests(unittest.TestCase):
    def test_monitor_off_is_emitted_once_on_idle_and_on_on_leave(self):
        events = []
        policy = RuntimePolicy(
            monitor_off=lambda: events.append("off"),
            monitor_on=lambda: events.append("on"),
        )
        policy.on_state(NodeState.ACTIVE_IDLE)
        policy.on_state(NodeState.ACTIVE_IDLE)
        policy.on_state(NodeState.PREPARING)
        policy.on_state(NodeState.WORKER_RUNNING)
        policy.on_state(NodeState.ACTIVE_IDLE)
        self.assertEqual(events, ["off", "on", "off"])

    def test_state_observer_receives_every_transition(self):
        states = []
        policy = RuntimePolicy(state_observer=states.append)
        policy.on_state(NodeState.ACTIVE_IDLE)
        policy.on_state(NodeState.PREPARING)
        self.assertEqual(states, [NodeState.ACTIVE_IDLE, NodeState.PREPARING])

    def test_retry_backoff_is_bounded_and_non_blocking(self):
        clock = [0.0]
        jobs = iter([Job("job-1", {})])
        results = iter([WorkerResult("retryable", "timeout"), WorkerResult("completed")])
        launches = []
        agent = NodeAgent(
            poll_job=lambda: next(jobs, None),
            heartbeat=lambda: None,
            prepare_job=lambda _: None,
            launch_worker=lambda job: launches.append(job.job_id) or object(),
            inspect_worker=lambda _: next(results),
            cleanup_job=lambda *_: None,
            now=lambda: clock[0],
            heartbeat_interval=20,
            max_retries=1,
            retry_backoff_seconds=5,
        )
        for _ in range(4):
            agent.tick()
        self.assertEqual(agent.state, NodeState.RECOVERY)
        self.assertEqual(launches, ["job-1"])
        clock[0] = 5.0
        for _ in range(5):
            agent.tick()
        self.assertEqual(agent.state, NodeState.ACTIVE_IDLE)
        self.assertEqual(launches, ["job-1", "job-1"])


if __name__ == "__main__":
    unittest.main()
