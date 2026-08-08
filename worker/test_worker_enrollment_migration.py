import unittest
from pathlib import Path


class WorkerEnrollmentMigrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sql = (
            Path(__file__).resolve().parents[1]
            / "worker_migrations"
            / "026_bounded_worker_enrollment.sql"
        ).read_text(encoding="utf-8").lower()

    def test_ticket_table_is_service_role_only(self):
        self.assertIn("alter table public.worker_enrollment_tickets enable row level security", self.sql)
        self.assertIn("revoke all on public.worker_enrollment_tickets from public, anon, authenticated", self.sql)
        self.assertIn("grant all on public.worker_enrollment_tickets to service_role", self.sql)

    def test_consume_is_atomic_bound_and_not_public(self):
        self.assertIn("for update", self.sql)
        self.assertIn("ticket.expected_worker_id <> p_worker_id", self.sql)
        self.assertIn("pg_advisory_xact_lock", self.sql)
        self.assertIn("on conflict (worker_id) do nothing", self.sql)
        self.assertIn(
            "from public, anon, authenticated", self.sql
        )
        self.assertIn("to service_role", self.sql)


if __name__ == "__main__":
    unittest.main()
