import unittest

from node_agent import Job, NodeAgent, NodeState, WorkerResult


class NodeAgentTests(unittest.TestCase):
    def make_agent(self, poll, inspect, max_retries=2):
        events = []
        clock = [0.0]
        agent = NodeAgent(
            poll_job=poll,
            heartbeat=lambda: events.append("heartbeat"),
            prepare_job=lambda job: events.append(f"prepare:{job.job_id}"),
            launch_worker=lambda job: events.append(f"launch:{job.job_id}") or f"worker:{job.job_id}",
            inspect_worker=inspect,
            cleanup_job=lambda job, result: events.append(f"cleanup:{result.status}"),
            now=lambda: clock[0],
            heartbeat_interval=20,
            max_retries=max_retries,
        )
        return agent, events, clock

    def test_idle_does_not_spawn_or_sleep(self):
        agent, events, _ = self.make_agent(lambda: None, lambda _: WorkerResult())
        self.assertEqual(agent.tick(), NodeState.ACTIVE_IDLE)
        self.assertEqual(events, ["heartbeat"])

    def test_complete_lifecycle_returns_to_active_idle(self):
        jobs = iter([Job("job-1", {})])
        agent, events, _ = self.make_agent(lambda: next(jobs, None), lambda _: WorkerResult("completed"))
        for _ in range(5):
            agent.tick()
        self.assertEqual(agent.state, NodeState.ACTIVE_IDLE)
        self.assertEqual(events[1:], ["prepare:job-1", "launch:job-1", "cleanup:completed"])

    def test_running_worker_is_not_spawned_twice(self):
        jobs = iter([Job("job-1", {})])
        agent, events, _ = self.make_agent(lambda: next(jobs, None), lambda _: WorkerResult("running"))
        for _ in range(5):
            agent.tick()
        self.assertEqual(events.count("launch:job-1"), 1)
        self.assertEqual(agent.state, NodeState.WORKER_RUNNING)

    def test_retry_is_bounded_then_cleanup(self):
        jobs = iter([Job("job-1", {})])
        results = iter([WorkerResult("retryable", "timeout")] * 3)
        agent, events, _ = self.make_agent(lambda: next(jobs, None), lambda _: next(results), max_retries=2)
        for _ in range(20):
            agent.tick()
        self.assertEqual(agent.state, NodeState.ACTIVE_IDLE)
        self.assertEqual(events.count("launch:job-1"), 3)
        self.assertEqual(events[-1], "cleanup:retryable")

    def test_non_retryable_failure_is_not_retried(self):
        jobs = iter([Job("job-1", {})])
        agent, events, _ = self.make_agent(lambda: next(jobs, None), lambda _: WorkerResult("failed", "bad input"))
        for _ in range(6):
            agent.tick()
        self.assertEqual(events.count("launch:job-1"), 1)
        self.assertEqual(agent.state, NodeState.ACTIVE_IDLE)

    def test_retry_jitter_is_bounded_and_deterministic(self):
        jobs = iter([Job("job-1", {})])
        agent, _, clock = self.make_agent(lambda: next(jobs, None), lambda _: WorkerResult("retryable", "timeout"))
        agent.retry_backoff_seconds = 10
        agent.retry_jitter_ratio = 0.25
        agent.random_value = lambda: 0.5

        for _ in range(5):
            agent.tick()

        self.assertEqual(agent.state, NodeState.PREPARING)
        self.assertEqual(agent.retry_ready_at, 11.25)
        self.assertEqual(clock[0], 0.0)

    def test_retry_jitter_ratio_must_be_bounded(self):
        with self.assertRaises(ValueError):
            NodeAgent(
                poll_job=lambda: None,
                heartbeat=lambda: None,
                prepare_job=lambda _: None,
                launch_worker=lambda _: None,
                inspect_worker=lambda _: WorkerResult(),
                cleanup_job=lambda *_: None,
                now=lambda: 0.0,
                retry_jitter_ratio=1.1,
            )

    def test_heartbeat_error_degrades_but_does_not_crash(self):
        jobs = iter([None])
        agent = NodeAgent(
            poll_job=lambda: next(jobs, None), heartbeat=lambda: (_ for _ in ()).throw(RuntimeError("network")),
            prepare_job=lambda _: None, launch_worker=lambda _: None,
            inspect_worker=lambda _: WorkerResult("completed"), cleanup_job=lambda *_: None,
            now=lambda: 0.0,
        )
        self.assertEqual(agent.tick(), NodeState.ACTIVE_IDLE)
        self.assertEqual(agent.last_heartbeat_error, "network")


if __name__ == "__main__":
    unittest.main()

