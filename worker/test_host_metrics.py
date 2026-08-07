import unittest
from unittest.mock import patch

from host_metrics import collect_host_metrics


class HostMetricsTests(unittest.TestCase):
    def test_collection_is_bounded_and_non_secret(self):
        with patch("host_metrics.subprocess.run") as run:
            run.return_value.returncode = 1
            run.return_value.stdout = ""
            result = collect_host_metrics(123)
        self.assertEqual(result["pid"], 123)
        self.assertIn("gpu", result)
        self.assertNotIn("CWS_B2_APP_KEY", str(result))


if __name__ == "__main__":
    unittest.main()
