import unittest

from worker_engine import PermanentWorkerError
from staging_adapters import StagingConfig


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
            "CWS_STAGING_WORKER_ID": "staging-node-1",
            "CWS_STAGING_FLEET_ID": "staging-fleet",
        })
        self.assertEqual(config.b2_endpoint, "s3.us-west-004.backblazeb2.com")
        self.assertEqual(config.worker_id, "staging-node-1")


if __name__ == "__main__":
    unittest.main()
