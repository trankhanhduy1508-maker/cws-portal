import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from canonical_worker_launcher import ArtifactValidationError, PinnedWorkerLauncher, WorkerArtifact


class PinnedWorkerLauncherTests(unittest.TestCase):
    def make_package(self):
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        entry = root / "worker_engine.py"
        launcher = root / "worker-engine.bat"
        entry.write_text("print('staging')\n", encoding="utf-8")
        launcher.write_text("@echo off\r\nexit /b 0\r\n", encoding="utf-8")
        hashes = {}
        for path in (entry, launcher):
            hashes[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
        (root / "worker-engine-manifest.json").write_text(
            json.dumps({"version": "0.1.0", "files": hashes}), encoding="utf-8"
        )
        return temp, root

    def test_validates_pinned_package(self):
        temp, root = self.make_package()
        self.addCleanup(temp.cleanup)
        result = PinnedWorkerLauncher(WorkerArtifact(root)).validate()
        self.assertEqual(result["version"], "0.1.0")

    def test_rejects_tampered_entrypoint(self):
        temp, root = self.make_package()
        self.addCleanup(temp.cleanup)
        (root / "worker_engine.py").write_text("tampered\n", encoding="utf-8")
        with self.assertRaises(ArtifactValidationError):
            PinnedWorkerLauncher(WorkerArtifact(root)).validate()

    def test_rejects_path_traversal(self):
        temp, root = self.make_package()
        self.addCleanup(temp.cleanup)
        manifest = {"version": "0.1.0", "files": {"..\\outside": "0"}}
        (root / "worker-engine-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaises(ArtifactValidationError):
            PinnedWorkerLauncher(WorkerArtifact(root)).validate()


if __name__ == "__main__":
    unittest.main()
