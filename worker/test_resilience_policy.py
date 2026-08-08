import unittest

from resilience_policy import (
    FailureCategory,
    bounded_exponential_backoff,
    fails_closed,
    penalizes_worker,
    stable_jitter_value,
    task_retryable,
)


class ResiliencePolicyTests(unittest.TestCase):
    def test_taxonomy_keeps_customer_and_transport_failures_off_worker_health(self):
        self.assertFalse(penalizes_worker(FailureCategory.CUSTOMER_INPUT_ERROR))
        self.assertFalse(penalizes_worker(FailureCategory.STORAGE_TRANSIENT))
        self.assertFalse(penalizes_worker(FailureCategory.NETWORK_TRANSIENT))
        self.assertTrue(penalizes_worker(FailureCategory.BLENDER_RENDER_ERROR))
        self.assertTrue(task_retryable(FailureCategory.CAPABILITY_MISMATCH))
        self.assertTrue(fails_closed(FailureCategory.SECURITY_VIOLATION))

    def test_deterministic_backoff_is_bounded_and_jittered(self):
        first = stable_jitter_value("worker-a", 2)
        self.assertEqual(first, stable_jitter_value("worker-a", 2))
        self.assertGreaterEqual(first, 0)
        self.assertLess(first, 1)
        self.assertEqual(
            bounded_exponential_backoff(1, 1, 10, jitter_ratio=0), 1
        )
        self.assertEqual(
            bounded_exponential_backoff(1, 4, 10, jitter_ratio=0), 8
        )
        self.assertLessEqual(
            bounded_exponential_backoff(1, 8, 10, jitter_value=1), 10
        )

    def test_invalid_backoff_inputs_fail_closed(self):
        with self.assertRaises(ValueError):
            bounded_exponential_backoff(1, 0, 10)
        with self.assertRaises(ValueError):
            bounded_exponential_backoff(1, 1, 10, jitter_value=2)


if __name__ == "__main__":
    unittest.main()
