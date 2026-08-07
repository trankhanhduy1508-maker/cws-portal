import tempfile
import unittest
import zipfile
from pathlib import Path

from blender_bootstrap import _safe_member, resolve_blender
from worker_engine import PermanentWorkerError


class BlenderBootstrapTests(unittest.TestCase):
    def test_archive_member_path_traversal_is_rejected(self):
        with self.assertRaises(PermanentWorkerError):
            _safe_member("../blender.exe")

    def test_explicit_blender_path_must_be_real_executable(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(PermanentWorkerError):
                resolve_blender(Path(tmp) / "missing.exe", Path(tmp))

    def test_pinned_archive_extracts_only_safe_blender_binary(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / "blender-pinned.zip"
            with zipfile.ZipFile(archive, "w") as package:
                package.writestr("Blender 5.2/blender.exe", b"binary")
            import hashlib
            digest = hashlib.sha256(archive.read_bytes()).hexdigest()
            found = resolve_blender(None, root, "https://download.blender.org/x.zip", digest)
            self.assertTrue(found.name.lower() == "blender.exe")
            self.assertTrue(found.is_file())


if __name__ == "__main__":
    unittest.main()
