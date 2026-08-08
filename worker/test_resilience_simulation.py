import unittest

from resilience_simulation import run_all


class ResilienceSimulationTests(unittest.TestCase):
    def test_10_25_50_100_worker_scenarios(self):
        results = run_all()
        self.assertEqual([item["workers"] for item in results], [10, 25, 50, 100])
        for result in results:
            self.assertEqual(result["unique_claims"], result["workers"])
            self.assertEqual(result["storage_operation_attempts"], 3)
            self.assertEqual(result["render_failure_health"], "DEGRADED")
            self.assertEqual(result["render_failure_quarantine"], "QUARANTINED")
            self.assertEqual(result["security_probe"], "BLOCKED")
            self.assertFalse(result["stale_completion_accepted"])


if __name__ == "__main__":
    unittest.main()
