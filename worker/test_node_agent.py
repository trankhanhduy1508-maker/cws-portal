import unittest\n\nfrom node_agent import Job, NodeAgent, NodeState, WorkerResult\n\n\nclass NodeAgentTests(unittest.TestCase):\n    def make_agent(self, poll, inspect, max_retries=2):\n        events = []\n        clock = [0.0]\n        agent = NodeAgent(\n            poll_job=poll,\n            heartbeat=lambda: events.append("heartbeat"),\n            prepare_job=lambda job: events.append(f"prepare:{job.job_id}"),\n            launch_worker=lambda job: events.append(f"launch:{job.job_id}") or f"worker:{job.job_id}",\n            inspect_worker=inspect,\n            cleanup_job=lambda job, result: events.append(f"cleanup:{result.status}"),\n            now=lambda: clock[0],\n            heartbeat_interval=20,\n            max_retries=max_retries,\n        )\n        return agent, events, clock\n\n    def test_idle_does_not_spawn_or_sleep(self):\n        agent, events, _ = self.make_agent(lambda: None, lambda _: WorkerResult())\n        self.assertEqual(agent.tick(), NodeState.ACTIVE_IDLE)\n        self.assertEqual(events, ["heartbeat"])\n\n    def test_complete_lifecycle_returns_to_active_idle(self):\n        jobs = iter([Job("job-1", {})])\n        agent, events, _ = self.make_agent(lambda: next(jobs, None), lambda _: WorkerResult("completed"))\n        for _ in range(5):\n            agent.tick()\n        self.assertEqual(agent.state, NodeState.ACTIVE_IDLE)\n        self.assertEqual(events[1:], ["prepare:job-1", "launch:job-1", "cleanup:completed"])\n\n    def test_running_worker_is_not_spawned_twice(self):\n        jobs = iter([Job("job-1", {})])\n        agent, events, _ = self.make_agent(lambda: next(jobs, None), lambda _: WorkerResult("running"))\n        for _ in range(5):\n            agent.tick()\n        self.assertEqual(events.count("launch:job-1"), 1)\n        self.assertEqual(agent.state, NodeState.WORKER_RUNNING)\n\n    def test_retry_is_bounded_then_cleanup(self):\n        jobs = iter([Job("job-1", {})])\n        results = iter([WorkerResult("retryable", "timeout")] * 3)\n        agent, events, _ = self.make_agent(lambda: next(jobs, None), lambda _: next(results), max_retries=2)\n        for _ in range(20):\n            agent.tick()\n        self.assertEqual(agent.state, NodeState.ACTIVE_IDLE)\n        self.assertEqual(events.count("launch:job-1"), 3)\n        self.assertEqual(events[-1], "cleanup:retryable")\n\n    def test_non_retryable_failure_is_not_retried(self):
        jobs = iter([Job("job-1", {})])\n        agent, events, _ = self.make_agent(lambda: next(jobs, None), lambda _: WorkerResult("failed", "bad input"))\n        for _ in range(6):\n            agent.tick()\n        self.assertEqual(events.count("launch:job-1"), 1)
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
\n    def test_heartbeat_error_degrades_but_does_not_crash(self):\n        jobs = iter([None])\n        agent = NodeAgent(\n            poll_job=lambda: next(jobs, None), heartbeat=lambda: (_ for _ in ()).throw(RuntimeError("network")),\n            prepare_job=lambda _: None, launch_worker=lambda _: None,\n            inspect_worker=lambda _: WorkerResult("completed"), cleanup_job=lambda *_: None,\n            now=lambda: 0.0,\n        )\n        self.assertEqual(agent.tick(), NodeState.ACTIVE_IDLE)\n        self.assertEqual(agent.last_heartbeat_error, "network")\n\n\nif __name__ == "__main__":\n    unittest.main()\n\n