from pathlib import Path
import re
import unittest


class WorkerRpcPrivilegeMigrationTests(unittest.TestCase):
    def test_gateway_only_migration_covers_worker_rpc_surface(self) -> None:
        migrations = Path(__file__).resolve().parents[1] / "worker_migrations"
        sql = "\n".join(
            (migrations / name).read_text(encoding="utf-8")
            for name in (
                "023_worker_rpc_gateway_only.sql",
                "024_worker_input_capability_claim.sql",
                "025_internal_rpc_gateway_hardening.sql",
                "027_worker_resilience_policy.sql",
                "028_report_job_metadata_rpc.sql",
            )
        )

        required = {
            "register_worker(text,bigint,text,integer)",
            "worker_ping(text)",
            "claim_next_generic_task(text,integer)",
            "claim_next_resilient_task(text,integer)",
            "claim_next_resilient_task(text,integer,text[])",
            "get_claimed_task_spec(bigint,integer,text)",
            "report_heartbeat(bigint,integer,text)",
            "complete_task(bigint,integer,text)",
            "fail_task(bigint,integer,text,text)",
            "update_task_stage(bigint,integer,text,text,integer)",
            "report_worker_state_transition(text,text,bigint,text)",
            "report_worker_crash(text,text)",
            "report_worker_incident(text,bigint,text,text,text,text,jsonb)",
            "finalize_task_attempt(bigint,text,integer,text)",
            "handle_new_auth_user()",
            "report_worker_failure(bigint,integer,text,text,text)",
            "report_worker_probe(text,text,text)",
            "report_job_metadata(bigint,integer,text,integer,integer,integer,numeric)",
        }
        compact_sql = re.sub(r"\s+", "", sql)
        for signature in required:
            self.assertIn(signature, compact_sql)

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
