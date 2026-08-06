import unittest

from failover_simulation import FailoverSimulation, run_all


class FailoverSimulationTests(unittest.TestCase):
    def test_required_scenarios_pass(self):
        self.assertEqual(len(run_all()), 6)

    def test_reconnect_cannot_finalize_fenced_attempt(self):
        sim = FailoverSimulation()
        self.assertTrue(sim.claim("worker-a"))
        old_generation = sim.task.generation
        sim.advance(241)
        self.assertTrue(sim.requeue_stale())
        sim.workers["worker-a"].online = True
        self.assertFalse(sim.complete("worker-a", old_generation))

    def test_idle_saver_worker_can_become_replacement(self):
        sim = FailoverSimulation()
        sim.workers["worker-b"].idle_saver = True
        self.assertTrue(sim.claim("worker-a"))
        sim.advance(241)
        self.assertTrue(sim.requeue_stale())
        self.assertTrue(sim.claim("worker-b"))
        self.assertFalse(sim.workers["worker-b"].idle_saver)


if __name__ == "__main__":
    unittest.main()
