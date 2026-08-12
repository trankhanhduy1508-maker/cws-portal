import unittest

from machine_fingerprint import normalize_signal


class MachineFingerprintTests(unittest.TestCase):
    def test_normalization_is_deterministic_and_not_a_worker_id(self):
        self.assertEqual(normalize_signal("  GPU   Host\n"), "gpu host")
        self.assertNotRegex(normalize_signal("MachineGuid"), r"^cwsw_[a-f0-9]{32}$")


if __name__ == "__main__":
    unittest.main()
