import tempfile
import unittest
from pathlib import Path

from node_engine.capabilities import HostCapabilities
from node_engine.readiness import evaluate_readiness


class NodeEngineReadinessTests(unittest.TestCase):
    def _capabilities(self, disk_free_mb=1024, blender_available=True):
        return HostCapabilities(
            hostname="test-host",
            os_name="Windows",
            os_version="test",
            cpu_count=8,
            ram_mb=16384,
            disk_free_mb=disk_free_mb,
            gpu_name="test-gpu",
            vram_mb=8192,
            nvidia_driver="test-driver",
            cuda_available=True,
            blender_version="Blender 5",
            blender_available=blender_available,
        )

    def test_ready_requires_all_local_contracts(self):
        with tempfile.TemporaryDirectory() as root:
            workspace = Path(root)
            credential = workspace / "credential.dpapi"
            credential.write_text("ciphertext", encoding="ascii")
            result = evaluate_readiness(
                backend_url="https://backend.example",
                worker_id="worker-a",
                credential_file=credential,
                workspace=workspace,
                capabilities=self._capabilities(),
            )
            self.assertTrue(result.ready)
            self.assertEqual(result.reasons, ())

    def test_readiness_fails_closed_for_missing_blender_and_disk(self):
        with tempfile.TemporaryDirectory() as root:
            workspace = Path(root)
            result = evaluate_readiness(
                backend_url="https://backend.example",
                worker_id="worker-a",
                credential_file=workspace / "missing",
                workspace=workspace,
                capabilities=self._capabilities(1, blender_available=False),
            )
            self.assertFalse(result.ready)
            self.assertIn("credential_file", result.reasons)
            self.assertIn("disk", result.reasons)
            self.assertIn("blender", result.reasons)


if __name__ == "__main__":
    unittest.main()
