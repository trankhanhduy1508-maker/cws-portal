import unittest
from pathlib import Path

from production_node_agent import (
    DriveOrB2Downloader,
    ProductionConfig,
    ProductionRpcAdapter,
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
