import unittest
import tempfile
from types import SimpleNamespace
from pathlib import Path

from production_node_agent import (
    DriveOrB2Downloader,
    ProductionConfig,
    ProductionRpcAdapter,
    ProductionB2CheckpointStore,
    _single_assignment,
)
from worker_engine import PermanentWorkerError


class FakeClient:
    def __init__(self, values):
        self.values = list(values)
        self.calls = []

    def call(self, operation, payload):
        self.calls.append((operation, payload))
        return self.values.pop(0)


class ProductionNodeAgentContractTests(unittest.TestCase):
    def test_download_validation_rejects_html_and_accepts_blend_signatures(self):
        with tempfile.TemporaryDirectory() as root:
            html = Path(root) / "error.blend"
            html.write_text("<html>error</html>", encoding="utf-8")
            with self.assertRaises(PermanentWorkerError):
                DriveOrB2Downloader._validate_downloaded_file(html)
            blend = Path(root) / "scene.blend"
            blend.write_bytes(b"BLENDER-v")
            DriveOrB2Downloader._validate_downloaded_file(blend)

    def test_config_requires_all_production_credentials(self):
        with self.assertRaises(PermanentWorkerError):
            ProductionConfig.from_env({})

    def test_claim_then_fenced_spec_builds_dynamic_job_spec(self):
        config = ProductionConfig.from_env(
            {
                "CWS_BACKEND_URL": "https://backend.example",
                "CWS_WORKER_ID": "worker-a",
                "CWS_WORKER_CREDENTIAL_FILE": "C:/secure/worker.dpapi",
                "CWS_BLENDER_EXE": "C:/Blender/blender.exe",
                "CWS_WORKSPACE": "C:/CWS/work",
                "CWS_B2_ENDPOINT": "s3.us-west-004.backblazeb2.com",
                "CWS_B2_BUCKET": "cws-prod",
                "CWS_B2_KEY_ID": "key-id",
                "CWS_B2_APP_KEY": "app-key",
                "CWS_B2_OUTPUT_PREFIX": "renders",
                "CWS_GOOGLE_DRIVE_API_KEY": "drive-key",
            }
        )
        client = FakeClient(
            [
                [
                    {
                        "task_id": 42,
                        "job_id": "job-1",
                        "frame_start": 1,
                        "frame_end": 2,
                        "lease_generation": 7,
                        "attempt_id": 9,
                    }
                ],
                [
                    {
                        "job_id": "job-1",
                        "task_id": "42",
                        "attempt_id": "9",
                        "lease_generation": 7,
                        "project_uri": "b2://cws-prod/source/job-1.blend",
                        "frame_start": 1,
                        "frame_end": 2,
                        "output_prefix": "renders/job-1",
                        "output_format": "png",
                        "required_vram_mb": 0,
                        "required_ram_mb": 0,
                    }
                ],
            ]
        )
        spec = ProductionRpcAdapter(client, config).claim()
        self.assertEqual(spec.job_id, "job-1")
        self.assertEqual(spec.project_uri, "b2://cws-prod/source/job-1.blend")
        self.assertEqual(
            client.calls,
            [
                ("claim_next_resilient_task", {"p_worker_vram_mb": 0}),
                ("get_claimed_task_spec", {"p_task_id": 42, "p_generation": 7}),
            ],
        )

    def test_drive_download_signature_selects_zip_without_url_extension(self):
        with tempfile.TemporaryDirectory() as root:
            archive = Path(root) / "input.download"
            archive.write_bytes(b"PK\x03\x04archive")
            self.assertEqual(DriveOrB2Downloader._detect_download_suffix(archive), ".zip")

    def test_transition_maps_worker_running_to_rendering(self):
        config = ProductionConfig.from_env(
            {
                "CWS_BACKEND_URL": "https://backend.example",
                "CWS_WORKER_ID": "worker-a",
                "CWS_WORKER_CREDENTIAL_FILE": "C:/secure/worker.dpapi",
                "CWS_WORKSPACE": "C:/CWS/work",
                "CWS_B2_ENDPOINT": "s3.us-west-004.backblazeb2.com",
                "CWS_B2_BUCKET": "cws-prod",
                "CWS_B2_KEY_ID": "key-id",
                "CWS_B2_APP_KEY": "app-key",
                "CWS_B2_OUTPUT_PREFIX": "renders",
                "CWS_GOOGLE_DRIVE_API_KEY": "drive-key",
            }
        )
        client = FakeClient([True])
        ProductionRpcAdapter(client, config).transition("WORKER_RUNNING", 42)
        self.assertEqual(
            client.calls,
            [("report_worker_state_transition", {"p_to_state": "RENDERING", "p_task_id": 42})],
        )

    def test_render_timeout_must_be_positive(self):
        values = {
            "CWS_BACKEND_URL": "https://backend.example",
            "CWS_WORKER_ID": "worker-a",
            "CWS_WORKER_CREDENTIAL_FILE": "C:/secure/worker.dpapi",
            "CWS_WORKSPACE": "C:/CWS/work",
            "CWS_B2_ENDPOINT": "s3.us-west-004.backblazeb2.com",
            "CWS_B2_BUCKET": "cws-prod",
            "CWS_B2_KEY_ID": "key-id",
            "CWS_B2_APP_KEY": "app-key",
            "CWS_B2_OUTPUT_PREFIX": "renders",
            "CWS_GOOGLE_DRIVE_API_KEY": "drive-key",
            "CWS_RENDER_TIMEOUT_SECONDS": "0",
        }
        with self.assertRaises(PermanentWorkerError):
            ProductionConfig.from_env(values)

    def test_b2_resume_verifies_remote_bytes_not_metadata_only(self):
        payload = b"verified-png-payload"

        class Body:
            def __init__(self, value):
                self.value = value

            def read(self, size):
                value, self.value = self.value[:size], self.value[size:]
                return value

            def close(self):
                return None

        class Client:
            def head_object(self, **_kwargs):
                import hashlib
                return {
                    "Metadata": {
                        "job_id": "job-1",
                        "task_id": "42",
                        "frame": "1",
                        "bytes": str(len(payload)),
                        "sha256": hashlib.sha256(payload).hexdigest(),
                    }
                }

            def get_object(self, **_kwargs):
                return {"Body": Body(payload)}

        store = object.__new__(ProductionB2CheckpointStore)
        store.config = SimpleNamespace(b2_bucket="bucket")
        store.client = Client()
        store._client_error = Exception
        value = ProductionConfig.from_env(
            {
                "CWS_BACKEND_URL": "https://backend.example",
                "CWS_WORKER_ID": "worker-a",
                "CWS_WORKER_CREDENTIAL_FILE": "C:/secure/worker.dpapi",
                "CWS_WORKSPACE": "C:/CWS/work",
                "CWS_B2_ENDPOINT": "s3.example",
                "CWS_B2_BUCKET": "bucket",
                "CWS_B2_KEY_ID": "key-id",
                "CWS_B2_APP_KEY": "app-key",
                "CWS_B2_OUTPUT_PREFIX": "renders",
                "CWS_GOOGLE_DRIVE_API_KEY": "drive-key",
            }
        )
        spec = ProductionRpcAdapter(FakeClient([]), value).config
        del spec
        from worker_engine import JobSpec
        job_spec = JobSpec.from_mapping({
            "job_id": "job-1", "task_id": "42", "attempt_id": "9",
            "lease_generation": 2, "project_uri": "b2://bucket/input.blend",
            "frame_start": 1, "frame_end": 1, "output_prefix": "renders",
            "output_format": "png",
        })
        self.assertTrue(store.is_verified(job_spec, 1))
        store.client.get_object = lambda **_kwargs: {"Body": Body(b"tampered")}
        self.assertFalse(store.is_verified(job_spec, 1))

    def test_drive_and_assignment_validation_fail_closed(self):
        self.assertEqual(
            DriveOrB2Downloader._drive_id(
                "https://drive.google.com/file/d/1AbC_-x/view"
            ),
            "1AbC_-x",
        )
        self.assertEqual(_single_assignment(None), None)
        with self.assertRaises(PermanentWorkerError):
            _single_assignment([{"job_id": "a"}, {"job_id": "b"}])

    def test_no_production_secret_is_written_by_module(self):
        source = (Path(__file__).parent / "production_node_agent.py").read_text()
        self.assertFalse("print(token)" in source)


if __name__ == "__main__":
    unittest.main()
