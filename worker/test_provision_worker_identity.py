import unittest

from provision_worker_identity import credential_hash, generate_token, sql_for_identity


class ProvisionWorkerIdentityTests(unittest.TestCase):
    def test_token_is_high_entropy_urlsafe_and_hash_is_not_token(self):
        token = generate_token()
        self.assertGreaterEqual(len(token), 40)
        self.assertNotIn("=", token)
        self.assertNotEqual(token, credential_hash(token))
        self.assertEqual(len(credential_hash(token)), 64)

    def test_sql_contains_hash_only_and_escapes_worker_id(self):
        token = "a" * 43
        sql = sql_for_identity("worker'1", token, __import__("datetime").datetime.now(__import__("datetime").timezone.utc))
        self.assertIn("worker''1", sql)
        self.assertIn(credential_hash(token), sql)
        self.assertNotIn(token, sql)


if __name__ == "__main__":
    unittest.main()
