import unittest
import tempfile
from pathlib import Path

from production_node_agent import (
    DriveOrB2Downloader,
    ProductionConfig,
    NodeAgentInstanceLock,
    ProductionRpcAdapter,
    ProductionB2CheckpointStore,
    _capability_url,
    _single_assignment,
    _stable_startup_jitter,
)
from worker_engine import PermanentWorkerError


class FakeClient:
    def __init__(self, values):
        self.values = list(values)
        self.calls = []

    def call(self, operation, payload):
        self.calls.append((operation, payload))
        return self.values.pop(0)

    def call_path(self, path, payload):
        self.calls.append((path, payload))
        return self.values.pop(0)


class SimpleRpc:
    pass


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
            compressed_blend = Path(root) / "compressed.blend"
            compressed_blend.write_bytes(b"\x28\xb5\x2f\xfd\x00\x58\x9d\x21")
            DriveOrB2Downloader._validate_downloaded_file(compressed_blend)

    def test_config_requires_all_production_credentials(self):
        with self.assertRaises(PermanentWorkerError):
            ProductionConfig.from_env({})

    def test_worker_config_requires_no_b2_or_drive_secret(self):
        config = ProductionConfig.from_env(
            {
                "CWS_BACKEND_URL": "https://backend.example",
                "CWS_WORKER_ID": "worker-a",
                "CWS_WORKER_CREDENTIAL_FILE": "C:/secure/worker.dpapi",
                "CWS_WORKSPACE": "C:/CWS/work",
            }
        )
        self.assertIsNone(config.google_drive_api_key)
        self.assertFalse(hasattr(config, "b2_app_key"))

    def test_drive_input_fails_closed_without_drive_api_key(self):
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
            }
        )
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaisesRegex(PermanentWorkerError, "GOOGLE_DRIVE_API_KEY"):
                DriveOrB2Downloader(config, SimpleRpc())._download_http(
                    "https://drive.google.com/file/d/drive-file/view",
                    Path(root),
                )

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
                (
                    "claim_next_resilient_task",
                    {
                        "p_worker_vram_mb": 0,
                        "p_supported_input_schemes": ["b2", "google_drive"],
                    },
                ),
                ("get_claimed_task_spec", {"p_task_id": 42, "p_generation": 7}),
            ],
        )

    def test_b2_only_worker_advertises_no_drive_capability(self):
        config = ProductionConfig.from_env(
            {
                "CWS_BACKEND_URL": "https://backend.example",
                "CWS_WORKER_ID": "worker-a",
                "CWS_WORKER_CREDENTIAL_FILE": "C:/secure/worker.dpapi",
                "CWS_WORKSPACE": "C:/CWS/work",
            }
        )
        client = FakeClient([[]])
        self.assertIsNone(ProductionRpcAdapter(client, config).claim())
        self.assertEqual(
            client.calls,
            [
                (
                    "claim_next_resilient_task",
                    {
                        "p_worker_vram_mb": 0,
                        "p_supported_input_schemes": ["b2"],
                    },
                )
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

    def test_capability_resume_verifies_remote_bytes_not_metadata_only(self):
        payload = b"verified-png-payload"
        digest = __import__("hashlib").sha256(payload).hexdigest()

        class SimpleRpc:
            def storage_capability(self, *_args, **_kwargs):
                return {
                    "exists": True,
                    "method": "GET",
                    "url": "https://s3.us-west-004.backblazeb2.com/signed",
                    "headers": {},
                    "expires_in_seconds": 120,
                    "bytes": len(payload),
                    "sha256": digest,
                }

        store = ProductionB2CheckpointStore(SimpleRpc())
        store._remote_digest = lambda _capability: (len(payload), digest)
        from worker_engine import JobSpec
        job_spec = JobSpec.from_mapping({
            "job_id": "job-1", "task_id": "42", "attempt_id": "9",
            "lease_generation": 2, "project_uri": "b2://bucket/input.blend",
            "frame_start": 1, "frame_end": 1, "output_prefix": "renders",
            "output_format": "png",
        })
        self.assertTrue(store.is_verified(job_spec, 1))
        store._remote_digest = lambda _capability: (8, "0" * 64)
        self.assertFalse(store.is_verified(job_spec, 1))

    def test_storage_capability_rejects_non_backblaze_hosts(self):
        with self.assertRaises(PermanentWorkerError):
            _capability_url(
                {
                    "method": "GET",
                    "url": "https://127.0.0.1/internal",
                    "expires_in_seconds": 120,
                },
                "GET",
            )

    def test_heartbeat_only_reports_idle_before_first_ping(self):
        from unittest.mock import patch
        from production_node_agent import ProductionNodeAgentRuntime

        runtime = object.__new__(ProductionNodeAgentRuntime)

        class Rpc:
            def __init__(self):
                self.calls = []

            def transition(self, state, reason=None):
                self.calls.append(("transition", state, reason))

            def worker_ping(self):
                self.calls.append(("ping",))
                raise KeyboardInterrupt

        runtime.rpc = Rpc()
        runtime.config = type(
            "Config",
            (),
            {
                "heartbeat_seconds": 15,
                "startup_jitter_seconds": 0,
                "worker_id": "worker-a",
            },
        )()
        with patch("production_node_agent.time.sleep"):
            with self.assertRaises(KeyboardInterrupt):
                runtime.run_heartbeat_only()
        self.assertEqual(
            runtime.rpc.calls,
            [("transition", "ACTIVE_IDLE", "heartbeat_only"), ("ping",)],
        )

    def test_100_worker_startup_is_stably_staggered(self):
        first = [_stable_startup_jitter(f"CWS-{index:03d}", 5.0) for index in range(100)]
        second = [_stable_startup_jitter(f"CWS-{index:03d}", 5.0) for index in range(100)]
        self.assertEqual(first, second)
        self.assertGreater(max(first) - min(first), 4.0)
        self.assertGreaterEqual(len({int(value * 10) for value in first}), 30)
        self.assertEqual(_stable_startup_jitter("CWS-A", 0), 0)

    def test_duplicate_node_agent_instance_is_rejected_and_lock_recovers(self):
        with tempfile.TemporaryDirectory() as root:
            first = NodeAgentInstanceLock(Path(root))
            second = NodeAgentInstanceLock(Path(root))
            with first:
                with self.assertRaisesRegex(
                    PermanentWorkerError, "already running"
                ):
                    second.__enter__()
            with NodeAgentInstanceLock(Path(root)):
                pass

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
