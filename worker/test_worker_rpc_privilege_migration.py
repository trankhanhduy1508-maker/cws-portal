from pathlib import Path
import unittest


class WorkerRpcPrivilegeMigrationTests(unittest.TestCase):
    def test_gateway_only_migration_covers_worker_rpc_surface(self) -> None:
        sql = (
            Path(__file__).resolve().parents[1]
            / "worker_migrations"
            / "023_worker_rpc_gateway_only.sql"
        ).read_text(encoding="utf-8")

        required = {
            "register_worker(text,bigint,text,integer)",
            "worker_ping(text)",
            "claim_next_generic_task(text,integer)",
            "claim_next_resilient_task(text,integer)",
            "get_claimed_task_spec(bigint,integer,text)",
            "report_heartbeat(bigint,integer,text)",
            "complete_task(bigint,integer,text)",
            "fail_task(bigint,integer,text,text)",
            "update_task_stage(bigint,integer,text,text,integer)",
            "report_worker_state_transition(text,text,bigint,text)",
        }
        for signature in required:
            self.assertIn(signature, sql)

        self.assertIn(
            "from public, anon, authenticated",
            sql.lower(),
        )
        self.assertIn("to service_role", sql.lower())
        self.assertNotIn("grant execute on function public.%s to anon", sql.lower())
        self.assertNotIn(
            "grant execute on function public.%s to authenticated", sql.lower()
        )


if __name__ == "__main__":
    unittest.main()
