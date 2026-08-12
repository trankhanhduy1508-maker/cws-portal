import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LEGACY_MIGRATION = (
    ROOT / "worker_migrations" / "031_legacy_enrollment_compatibility_bridge.sql"
).read_text(encoding="utf-8")
AUTOMATIC_MIGRATION = (
    ROOT / "worker_migrations" / "030_automatic_worker_provisioning.sql"
).read_text(encoding="utf-8")
AUTOMATIC_NULL_FIX = (
    ROOT / "worker_migrations" / "032_harden_automatic_enrollment_null_inputs.sql"
).read_text(encoding="utf-8")


class WorkerEnrollmentCompatibilityTests(unittest.TestCase):
    def test_legacy_bridge_accepts_historical_ids_only_for_unbound_tickets(self):
        self.assertIn("p_worker_id !~ '^[A-Za-z0-9._~-]{1,128}$'", LEGACY_MIGRATION)
        self.assertIn("ticket.fingerprint_hash is not null", LEGACY_MIGRATION)
        self.assertIn("ticket.expected_worker_id <> p_worker_id", LEGACY_MIGRATION)

    def test_legacy_bridge_is_idempotent_and_collision_safe(self):
        self.assertIn("pg_advisory_xact_lock", LEGACY_MIGRATION)
        self.assertIn("ticket.consumed_worker_id = p_worker_id", LEGACY_MIGRATION)
        self.assertIn("ticket.consumed_credential_hash = p_credential_hash", LEGACY_MIGRATION)
        self.assertIn("from public.worker_identities where worker_id = p_worker_id", LEGACY_MIGRATION)
        self.assertIn("exception when unique_violation", LEGACY_MIGRATION)
        self.assertNotIn("on conflict (worker_id) do update", LEGACY_MIGRATION.lower())

    def test_automatic_path_remains_fingerprint_bound_and_canonical(self):
        self.assertIn("p_worker_id !~ '^cwsw_[a-f0-9]{32}$'", AUTOMATIC_MIGRATION)
        self.assertIn("p_fingerprint_hash !~ '^[a-f0-9]{64}$'", AUTOMATIC_MIGRATION)
        self.assertIn("ticket.fingerprint_hash <> p_fingerprint_hash", AUTOMATIC_MIGRATION)

    def test_automatic_path_fails_closed_for_missing_fingerprint(self):
        self.assertIn("p_fingerprint_hash is null", AUTOMATIC_NULL_FIX)
        self.assertIn("ticket.fingerprint_hash is distinct from p_fingerprint_hash", AUTOMATIC_NULL_FIX)


if __name__ == "__main__":
    unittest.main()
