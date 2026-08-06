import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / "worker" / "local_stress_worker_flow.py"
FIXTURE = ROOT / "tests" / "fixtures" / "cws_eevee_stress_job.template.json"


class LocalStressWorkerFlowContractTests(unittest.TestCase):
    def test_runner_uses_real_engine_and_checkpoint_recovery(self):
        text = RUNNER.read_text(encoding="utf-8")
        self.assertIn("WorkerEngine", text)
        self.assertIn("FilesystemCheckpointStore", text)
        self.assertIn("stop-after-frame", text)
        self.assertIn("simulated_interruption", text)

    def test_fixture_is_bounded_and_autoexec_disabled(self):
        text = FIXTURE.read_text(encoding="utf-8")
        self.assertIn('"frame_end": 48', text)
        self.assertIn('"autoexec": false', text)
        self.assertIn('"output_format": "png"', text)


if __name__ == "__main__":
    unittest.main()
