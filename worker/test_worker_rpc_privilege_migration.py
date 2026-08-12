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


    def test_metadata_contract_reconciles_seed_and_handles_legacy_rows(self) -> None:
        migration = (
            Path(__file__).resolve().parents[1]
            / "worker_migrations"
            / "028_report_job_metadata_rpc.sql"
        ).read_text(encoding="utf-8").lower()

        for fragment in (
            "t.worker_id = p_worker_id",
            "t.generation = p_generation",
            "t.status = 'active'",
            "v_bootstrap",
            "v_task_start = 1",
            "v_task_end = 1",
            "v_task_count = 1",
            "set frame_start = p_frame_start",
            "v_job_total is not null and v_job_total <> p_total_frames",
            "(v_job_start is null) <> (v_job_end is null)",
            "v_job_fps = p_fps",
            "jobs_frame_metadata_consistency_check",
        ):
            self.assertIn(fragment, migration)

        self.assertIn("and t.status = 'active'", migration)
        self.assertRegex(migration, r"frame_end\\s*=\\s*p_frame_start")
        self.assertIn("for update", migration)


if __name__ == "__main__":
    unittest.main()
