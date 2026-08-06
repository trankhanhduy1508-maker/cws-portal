import unittest
from staging_identity_smoke import PRODUCTION_HOSTS


class StagingIdentitySmokeTests(unittest.TestCase):
    def test_known_production_hosts_are_not_staging_targets(self):
        self.assertIn("cws-portal.vercel.app", PRODUCTION_HOSTS)
        self.assertIn("cws-portal.onrender.com", PRODUCTION_HOSTS)


if __name__ == "__main__":
    unittest.main()
