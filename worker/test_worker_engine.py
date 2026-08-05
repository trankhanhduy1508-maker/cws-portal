import tempfile
import unittest
from pathlib import Path

from worker_engine import (BasicOutputValidator, BasicPreflight, JobSpec,
                           FailureCategory, PermanentWorkerError,
                           RetryableWorkerError, WorkerEngine,
                           classify_blender_failure)


class Downloader:
    def download(self, spec, destination):
        path = destination / "project.blend"
        path.write_bytes(b"safe blend fixture")
        return path


class Renderer:
    def render(self, spec, project, frame, output):
        output.write_bytes(b"PNG-safe-render-output-" + str(frame).encode())
        return output


class Checkpoints:
    def __init__(self):
        self.frames = set()
        self.puts = []

    def is_verified(self, spec, frame):
        return frame in self.frames

    def put(self, spec, frame, output):
        self.puts.append(frame)

    def verify(self, spec, frame, output):
        self.frames.add(frame)


class Reporter:
    def __init__(self):
        self.events = []

    def stage(self, spec, state): self.events.append(("stage", state))
    def progress(self, spec, frame, total): self.events.append(("progress", frame, total))
    def complete(self, spec): self.events.append(("complete", spec.task_id))
    def fail(self, spec, category, message): self.events.append(("fail", category))


class Guard:
    def __init__(self, reject=False):
        self.events = []
        self.reject = reject

    def assert_active(self, spec):
        self.events.append("assert")
        if self.reject:
            raise PermanentWorkerError("stale fencing generation")

    def heartbeat(self, spec, state):
        self.events.append(state)


def spec(**overrides):
    value = {
        "job_id": "job-1", "task_id": "task-1", "attempt_id": "attempt-1",
        "lease_generation": 3, "project_uri": "b2://staging/input.blend",
        "frame_start": 1, "frame_end": 2, "output_prefix": "staging/task-1/",
        "output_format": "png", "autoexec": False,
    }
    value.update(overrides)
    return JobSpec.from_mapping(value)


class WorkerEngineTests(unittest.TestCase):
    def test_failure_classifier_separates_bad_project_from_node_failure(self):
        self.assertEqual(
            classify_blender_failure(1, "Error: cannot read file project.blend"),
            FailureCategory.PERMANENT,
        )
        self.assertEqual(
            classify_blender_failure(1, "CUDA out of memory on render node"),
            FailureCategory.RETRYABLE,
        )

    def test_dynamic_job_runs_all_frames_and_cleans_workspace(self):
        with tempfile.TemporaryDirectory() as tmp:
            checkpoints, reporter = Checkpoints(), Reporter()
            WorkerEngine(Path(tmp), Downloader(), BasicPreflight(), Renderer(),
                         checkpoints, BasicOutputValidator(10), reporter).run(spec())
            self.assertEqual(checkpoints.puts, [1, 2])
            self.assertIn(("complete", "task-1"), reporter.events)
            self.assertFalse((Path(tmp) / "task-1").exists())

    def test_verified_checkpoint_is_resumed_without_render(self):
        with tempfile.TemporaryDirectory() as tmp:
            checkpoints, reporter = Checkpoints(), Reporter()
            checkpoints.frames.add(1)
            WorkerEngine(Path(tmp), Downloader(), BasicPreflight(), Renderer(),
                         checkpoints, BasicOutputValidator(10), reporter).run(spec())
            self.assertEqual(checkpoints.puts, [2])

    def test_customer_autoexec_is_rejected(self):
        with self.assertRaisesRegex(Exception, "autoexec"):
            spec(autoexec=True)

    def test_unsafe_output_format_is_rejected(self):
        with self.assertRaisesRegex(Exception, "output_format"):
            spec(output_format="png/../../secret")

    def test_invalid_output_fails_and_cleans_workspace(self):
        class EmptyRenderer(Renderer):
            def render(self, spec, project, frame, output):
                output.write_bytes(b"")
                return output
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(RetryableWorkerError):
                WorkerEngine(Path(tmp), Downloader(), BasicPreflight(), EmptyRenderer(),
                             Checkpoints(), BasicOutputValidator(10), Reporter()).run(spec(frame_end=1))
            self.assertFalse((Path(tmp) / "task-1").exists())

    def test_lease_guard_heartbeats_and_fences_attempt(self):
        with tempfile.TemporaryDirectory() as tmp:
            guard, reporter = Guard(), Reporter()
            WorkerEngine(Path(tmp), Downloader(), BasicPreflight(), Renderer(),
                         Checkpoints(), BasicOutputValidator(10), reporter, guard).run(spec(frame_end=1))
            self.assertIn("CHECKPOINTED", guard.events)

            rejected = Guard(reject=True)
            with self.assertRaises(PermanentWorkerError):
                WorkerEngine(Path(tmp), Downloader(), BasicPreflight(), Renderer(),
                             Checkpoints(), BasicOutputValidator(10), Reporter(), rejected).run(spec(frame_end=1))
            self.assertFalse((Path(tmp) / "task-1").exists())


if __name__ == "__main__":
    unittest.main()
