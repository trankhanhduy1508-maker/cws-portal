import sys
import tempfile
import unittest
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from issue_worker_enrollment_batch import read_worker_ids


class BatchEnrollmentTests(unittest.TestCase):
    def test_reads_unique_bounded_worker_inventory(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "workers.txt"
            path.write_text("# inventory\nCWS-A\nCWS-B\n", encoding="utf-8")
            self.assertEqual(read_worker_ids(path), ["CWS-A", "CWS-B"])

    def test_rejects_duplicates_and_more_than_100(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "workers.txt"
            path.write_text("CWS-A\nCWS-A\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                read_worker_ids(path)
            path.write_text("\n".join(f"CWS-{i}" for i in range(101)), encoding="utf-8")
            with self.assertRaises(ValueError):
                read_worker_ids(path)


if __name__ == "__main__":
    unittest.main()
