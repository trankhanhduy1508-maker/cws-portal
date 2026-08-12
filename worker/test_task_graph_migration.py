import unittest
from pathlib import Path


def partition(start, end, chunk_size=10):
    ranges = [(start, start)]
    cursor = start + 1
    while cursor <= end:
        next_end = min(cursor + chunk_size - 1, end)
        ranges.append((cursor, next_end))
        cursor = next_end + 1
    return ranges


class TaskGraphMigrationContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sql = (
            Path(__file__).resolve().parents[1]
            / "worker_migrations"
            / "029_expand_job_task_graph.sql"
        ).read_text(encoding="utf-8").lower()

    def test_frame_start_not_one_has_exact_coverage(self):
        ranges = partition(11, 300)
        self.assertEqual(ranges[0], (11, 11))
        self.assertEqual(ranges[-1], (292, 300))
        self.assertEqual(sum(end - start + 1 for start, end in ranges), 290)
        self.assertEqual(ranges[0][0], 11)
        self.assertEqual(ranges[-1][1], 300)

    def test_ranges_have_no_overlap_or_gap(self):
        ranges = partition(11, 300)
        for previous, current in zip(ranges, ranges[1:]):
            self.assertEqual(current[0], previous[1] + 1)
            self.assertLessEqual(previous[1], current[0])

    def test_fenced_expansion_is_serialized_and_idempotent(self):
        self.assertIn("t.worker_id = p_worker_id", self.sql)
        self.assertIn("t.generation = p_generation", self.sql)
        self.assertIn("t.status = 'active'", self.sql)
        self.assertIn("from public.jobs j", self.sql)
        self.assertIn("for update", self.sql)
        self.assertIn("if v_chunking_status = 'chunked' then", self.sql)
        self.assertIn("v_task_count <> 1", self.sql)

    def test_seed_becomes_authoritative_first_frame(self):
        self.assertIn("set frame_start = p_frame_start", self.sql)
        self.assertIn("frame_end = p_frame_start", self.sql)
        self.assertIn("v_task_count = 1", self.sql)
        self.assertIn("v_task_start = 1 and v_task_end = 1", self.sql)
        self.assertNotIn("generation = generation + 1", self.sql)
        self.assertNotIn("worker_id = null", self.sql)

    def test_invalid_or_stale_metadata_fails_closed(self):
        self.assertIn("p_frame_end < p_frame_start", self.sql)
        self.assertIn("p_total_frames <> p_frame_end - p_frame_start + 1", self.sql)
        self.assertIn("p_fps <= 0", self.sql)
        self.assertIn("t.worker_id = p_worker_id", self.sql)
        self.assertIn("t.generation = p_generation", self.sql)
        self.assertIn("t.status = 'active'", self.sql)


if __name__ == "__main__":
    unittest.main()
