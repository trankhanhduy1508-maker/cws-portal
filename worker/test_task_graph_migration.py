Exit code: 0
Wall time: 1.4 seconds
Output:
import unittest
from pathlib import Path


class TaskGraphMigrationContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sql = (
            Path(__file__).resolve().parents[1]
            / "worker_migrations"
            / "029_expand_job_task_graph.sql"
        ).read_text(encoding="utf-8").lower()

    def test_metadata_expansion_is_fenced_and_job_serialized(self):
        self.assertIn("t.worker_id = p_worker_id", self.sql)
        self.assertIn("t.generation = p_generation", self.sql)
        self.assertIn("t.status = 'active'", self.sql)
        self.assertIn("from public.jobs j", self.sql)
        self.assertIn("for update", self.sql)

    def test_seed_becomes_authoritative_first_frame(self):
        self.assertIn("set frame_start = p_frame_start", self.sql)
        self.assertIn("frame_end = p_frame_start", self.sql)
        self.assertIn("v_task_count = 1", self.sql)
        self.assertIn("v_task_start = 1 and v_task_end = 1", self.sql)

    def test_remaining_ranges_are_contiguous_and_idempotent(self):
        self.assertIn("v_cursor := p_frame_start + 1", self.sql)
        self.assertIn("least(v_cursor + 9, p_frame_end)", self.sql)
        self.assertIn("values (v_job_id, v_cursor, v_next_end, 'queued')", self.sql)
        self.assertIn("chunking_status = 'chunked'", self.sql)
        self.assertIn("if v_chunking_status = 'chunked' then", self.sql)

    def test_task_identity_and_fencing_are_not_rotated(self):
        self.assertNotIn("generation = generation + 1", self.sql)
        self.assertNotIn("worker_id = null", self.sql)
        self.assertIn("status = 'active'", self.sql)

    def test_invalid_metadata_fails_closed(self):
        self.assertIn("p_frame_end < p_frame_start", self.sql)
        self.assertIn("p_total_frames <> p_frame_end - p_frame_start + 1", self.sql)
        self.assertIn("p_fps <= 0", self.sql)


if __name__ == "__main__":
    unittest.main()

