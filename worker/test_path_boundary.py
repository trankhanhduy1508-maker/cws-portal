import os
import tempfile
import unittest
from pathlib import Path

from path_boundary import reject_reparse_points


class PathBoundaryTests(unittest.TestCase):
    def test_rejects_symlinked_job_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "workspace"
            outside = Path(temp) / "outside"
            root.mkdir()
            outside.mkdir()
            link = root / "task-1"
            try:
                os.symlink(outside, link, target_is_directory=True)
            except (OSError, NotImplementedError):
                self.skipTest("symlink creation is unavailable on this host")
            with self.assertRaises(ValueError):
                reject_reparse_points(root, link)


if __name__ == "__main__":
    unittest.main()
