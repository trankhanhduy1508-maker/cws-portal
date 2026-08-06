import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from staging_e2e import StagingProjectDownloader
from worker_engine import JobSpec, PermanentWorkerError


def make_spec(uri: str) -> JobSpec:
    return JobSpec.from_mapping({
        "job_id": "job-1", "task_id": "task-1", "attempt_id": "attempt-1",
        "lease_generation": 1, "project_uri": uri, "frame_start": 1,
        "frame_end": 1, "output_prefix": "staging/task-1",
        "output_format": "png", "autoexec": False,
    })


class StagingDownloaderSecurityTests(unittest.TestCase):
    def test_remote_download_requires_https_and_allowlisted_host(self):
        with tempfile.TemporaryDirectory() as tmp:
            downloader = StagingProjectDownloader(set())
            with self.assertRaisesRegex(PermanentWorkerError, "https"):
                downloader.download(make_spec("http://127.0.0.1/secret"), Path(tmp))
            with self.assertRaisesRegex(PermanentWorkerError, "allow the project host"):
                downloader.download(make_spec("https://files.example.test/input.blend"), Path(tmp))

    def test_remote_download_rejects_credentials_and_custom_port(self):
        with tempfile.TemporaryDirectory() as tmp:
            downloader = StagingProjectDownloader({"files.example.test"})
            for uri in (
                "https://user:pass@files.example.test/input.blend",
                "https://files.example.test:8443/input.blend",
            ):
                with self.assertRaisesRegex(PermanentWorkerError, "credentials or a custom port"):
                    downloader.download(make_spec(uri), Path(tmp))

    def test_remote_download_does_not_follow_redirects(self):
        with tempfile.TemporaryDirectory() as tmp:
            downloader = StagingProjectDownloader({"files.example.test"})
            with patch("staging_e2e.urllib.request.OpenerDirector.open", side_effect=PermanentWorkerError("redirects disabled")):
                with self.assertRaisesRegex(PermanentWorkerError, "redirects disabled"):
                    downloader.download(make_spec("https://files.example.test/input.blend"), Path(tmp))


if __name__ == "__main__":
    unittest.main()
