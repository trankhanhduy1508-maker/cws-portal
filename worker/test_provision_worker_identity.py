import unittest

from provision_worker_identity import credential_hash, generate_token, sql_for_identity, stable_worker_id


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
        self.assertIn("insert into public.workers", sql)
        self.assertIn("on conflict (worker_id) do nothing", sql)

    def test_stable_worker_id_is_deterministic_and_does_not_expose_guid(self):
        guid = "12345678-1234-1234-1234-123456789abc"
        first = stable_worker_id(guid)
        self.assertEqual(first, stable_worker_id(guid.upper()))
        self.assertRegex(first, r"^CWS-[A-F0-9]{16}$")
        self.assertNotIn("12345678", first)

    def test_sql_escapes_gpu_name_and_validates_integer_fields_upstream(self):
        token = "b" * 43
        sql = sql_for_identity(
            "CWS-WORKER-1",
            token,
            __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
            fleet_id=2,
            gpu_name="GPU 'Primary'",
            vram_mb=8192,
        )
        self.assertIn("GPU ''Primary''", sql)
        self.assertIn(", 2,", sql)
        self.assertIn(", 8192,", sql)


if __name__ == "__main__":
    unittest.main()
