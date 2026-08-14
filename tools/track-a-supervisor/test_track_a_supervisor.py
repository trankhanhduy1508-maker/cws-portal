import sqlite3
import tempfile
import unittest
from pathlib import Path

from track_a_supervisor import (
    delete_job,
    get_job,
    next_job_id,
    open_database,
    save_job,
    update_job,
    validate_job,
)


def job(job_id="CUSTOMER-A-001", **overrides):
    value = {
        "local_job_id": job_id,
        "customer_label": "Customer A",
        "input_type": "GOOGLE_DRIVE",
        "input_location": "https://drive.google.com/file/d/abc_123/view?usp=sharing",
        "input_file_name": "scene.blend",
        "frame_start": 1,
        "frame_end": 10,
        "deliverable_type": "FRAMES_ONLY",
    }
    value.update(overrides)
    return value


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.connection = open_database(Path(self.temp_dir.name) / "jobs.sqlite3")

    def tearDown(self):
        self.connection.close()
        self.temp_dir.cleanup()

    def test_valid_job_is_ready_and_output_namespace_is_derived(self):
        status, errors = save_job(self.connection, job())
        self.assertEqual(status, "READY_TO_SUBMIT")
        self.assertEqual(errors, [])
        saved = get_job(self.connection, "customer-a-001")
        self.assertEqual(saved["output_prefix"], "local/jobs/CUSTOMER-A-001")

    def test_multiple_jobs_for_same_customer_get_unique_ids(self):
        save_job(self.connection, job(next_job_id(self.connection, "Customer A")))
        self.assertEqual(next_job_id(self.connection, "Customer A"), "CUSTOMER-A-002")

    def test_duplicate_id_is_rejected_by_sqlite(self):
        save_job(self.connection, job())
        with self.assertRaises(sqlite3.IntegrityError):
            save_job(self.connection, job())

    def test_invalid_metadata_is_retained_as_invalid_for_edit(self):
        status, errors = save_job(self.connection, job(input_file_name="scene.zip"))
        self.assertEqual(status, "INVALID")
        self.assertTrue(errors)
        status, errors = update_job(self.connection, "CUSTOMER-A-001", {"input_file_name": "scene.blend"})
        self.assertEqual(status, "READY_TO_SUBMIT")
        self.assertEqual(errors, [])

    def test_secret_like_location_is_rejected_and_not_valid(self):
        errors = validate_job(job(input_location="https://drive.google.com/file/d/x/view?access_token=secret"))
        self.assertTrue(any("credential" in error for error in errors))
        with self.assertRaises(ValueError):
            save_job(self.connection, job(input_location="https://drive.google.com/file/d/x/view?access_token=secret"))

    def test_delete_only_local_queued_or_invalid(self):
        save_job(self.connection, job(input_file_name="bad.zip"))
        delete_job(self.connection, "CUSTOMER-A-001")
        self.assertIsNone(get_job(self.connection, "CUSTOMER-A-001"))
        save_job(self.connection, job())
        with self.assertRaises(ValueError):
            delete_job(self.connection, "CUSTOMER-A-001")


if __name__ == "__main__":
    unittest.main()
