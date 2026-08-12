import tempfile
import unittest
from pathlib import Path

from node_engine import discover_host_capabilities, evaluate_readiness


class NodeEngineTests(unittest.TestCase):
    def test_discovery_reports_only_local_facts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            workspace = root / "workspace"
            workspace.mkdir()
            blender = root / "blender.exe"
            blender.write_bytes(b"fixture")
            capabilities = discover_host_capabilities(blender, workspace)

            self.assertTrue(capabilities.blender_present)
            self.assertTrue(capabilities.workspace_present)
            self.assertTrue(capabilities.workspace_writable)
            self.assertEqual(capabilities.as_dict()["blender_executable"], str(blender))

    def test_readiness_fails_closed_for_missing_local_requirements(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            capabilities = discover_host_capabilities(
                root / "missing-blender.exe", root / "missing-workspace"
            )
            readiness = evaluate_readiness(
                backend_url="http://insecure.example",
                worker_id="",
                credential_file=root / "missing.dpapi",
                workspace=root / "missing-workspace",
                capabilities=capabilities,
            )

            self.assertFalse(readiness.ready)
            self.assertIn("backend_url_must_use_https", readiness.reasons)
            self.assertIn("worker_id_missing", readiness.reasons)
            self.assertIn("credential_file_missing", readiness.reasons)
            self.assertIn("blender_missing", readiness.reasons)
            self.assertIn("workspace_missing", readiness.reasons)

    def test_readiness_does_not_claim_backend_or_credential_validity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            workspace = root / "workspace"
            workspace.mkdir()
            blender = root / "blender.exe"
            blender.write_bytes(b"fixture")
            credential = root / "worker.dpapi"
            credential.write_bytes(b"opaque")
            capabilities = discover_host_capabilities(blender, workspace)

            readiness = evaluate_readiness(
                backend_url="https://backend.example",
                worker_id="worker-a",
                credential_file=credential,
                workspace=workspace,
                capabilities=capabilities,
            )

            self.assertTrue(readiness.ready)
            self.assertEqual(readiness.as_dict(), {"ready": True, "reasons": []})


if __name__ == "__main__":
    unittest.main()
