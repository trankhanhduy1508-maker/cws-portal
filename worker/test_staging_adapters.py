import unittest
from unittest.mock import patch

from worker_engine import PermanentWorkerError
from staging_adapters import StagingConfig, SupabaseStagingRpc


class StagingAdapterContractTests(unittest.TestCase):
    def test_missing_staging_secret_is_rejected(self):
        with self.assertRaisesRegex(PermanentWorkerError, "missing staging configuration"):
            StagingConfig.from_env({})

    def test_staging_config_normalizes_b2_endpoint_without_logging_secrets(self):
        config = StagingConfig.from_env({
            "CWS_STAGING_SUPABASE_URL": "https://staging.example.supabase.co/",
            "CWS_STAGING_SUPABASE_KEY": "publishable-staging-key",
            "CWS_STAGING_B2_ENDPOINT": "https://s3.us-west-004.backblazeb2.com/",
            "CWS_STAGING_B2_KEY_ID": "staging-key-id",
            "CWS_STAGING_B2_APP_KEY": "staging-app-key",
            "CWS_STAGING_B2_BUCKET": "cws-staging",
            "CWS_STAGING_B2_PREFIX": "cws-staging/worker-e2e",
            "CWS_STAGING_WORKER_ID": "staging-node-1",
            "CWS_STAGING_FLEET_ID": "42",
        })
        self.assertEqual(config.b2_endpoint, "s3.us-west-004.backblazeb2.com")
        self.assertEqual(config.worker_id, "staging-node-1")
        self.assertEqual(config.fleet_id, 42)
        self.assertEqual(config.b2_prefix, "cws-staging/worker-e2e")

    def test_claim_assignment_requires_complete_dynamic_job_spec(self):
        assignment = {
            "job_id": "job-1", "task_id": "task-1", "attempt_id": "attempt-1",
            "lease_generation": 3, "project_uri": "https://staging/input.blend",
            "frame_start": 1, "frame_end": 2, "output_prefix": "renders/",
            "output_format": "png", "autoexec": False,
        }
        spec = SupabaseStagingRpc.assignment_to_job_spec([assignment])
        self.assertEqual(spec.task_id, "task-1")
        self.assertIsNone(SupabaseStagingRpc.assignment_to_job_spec([None]))

    def test_claim_assignment_does_not_infer_missing_fields(self):
        with self.assertRaisesRegex(PermanentWorkerError, "JobSpec missing fields"):
            SupabaseStagingRpc.assignment_to_job_spec({"task_id": "task-1"})

    def test_claim_next_uses_staging_assignment_rpc(self):
        config = StagingConfig.from_env({
            "CWS_STAGING_SUPABASE_URL": "https://staging.example.supabase.co",
            "CWS_STAGING_SUPABASE_KEY": "publishable-staging-key",
            "CWS_STAGING_B2_ENDPOINT": "s3.us-west-004.backblazeb2.com",
            "CWS_STAGING_B2_KEY_ID": "staging-key-id",
            "CWS_STAGING_B2_APP_KEY": "staging-app-key",
            "CWS_STAGING_B2_BUCKET": "cws-staging",
            "CWS_STAGING_B2_PREFIX": "cws-staging/worker-e2e",
            "CWS_STAGING_WORKER_ID": "staging-node-1",
            "CWS_STAGING_FLEET_ID": "42",
        })
        rpc = SupabaseStagingRpc(config)
        with patch.object(rpc, "call", return_value=None) as call:
            self.assertIsNone(rpc.claim_next(8192))
        call.assert_called_once_with("claim_next_staging_job", {
            "p_worker_id": "staging-node-1",
            "p_worker_vram_mb": 8192,
        })


if __name__ == "__main__":
    unittest.main()
