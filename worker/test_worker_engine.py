import tempfile
import unittest
from unittest.mock import patch
import subprocess
from pathlib import Path

from worker_engine import (BasicOutputValidator, BasicPreflight, JobSpec,
                           FailureCategory, PermanentWorkerError,
                           FilesystemCheckpointStore, RetryableWorkerError, WorkerEngine,
                           OutputIntegrityValidator, classify_blender_failure)
from worker_engine import BlenderCliRenderer


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
    def test_blender_timeout_cleans_owned_process_tree_and_is_retryable(self):
        class TimedOutProcess:
            pid = 12345
            returncode = None

            def communicate(self, timeout):
                raise subprocess.TimeoutExpired(["blender"], timeout)

        with tempfile.TemporaryDirectory() as tmp:
            executable = Path(tmp) / "blender.exe"
            executable.write_bytes(b"fixture")
            project = Path(tmp) / "project.blend"
            project.write_bytes(b"safe blend")
            renderer = BlenderCliRenderer(executable, timeout_seconds=1)
            process = TimedOutProcess()
            with patch("worker_engine.subprocess.Popen", return_value=process), \\
                 patch.object(renderer, "_terminate_tree") as terminate:
                with self.assertRaises(RetryableWorkerError):
                    renderer.render(spec(), project, 1, Path(tmp) / "frame_0001.png")
                terminate.assert_called_once_with(process)

    def test_output_integrity_rejects_truncated_png(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "frame_0001.png"
            output.write_bytes(b"\\x89PNG\\r\\n\\x1a\\n" + b"\\x00" * 300)
            with self.assertRaises(RetryableWorkerError):
                OutputIntegrityValidator(10).validate(output)

    def test_output_integrity_accepts_structurally_valid_png_header(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "frame_0001.png"
            ihdr = (1920).to_bytes(4, "big") + (1080).to_bytes(4, "big") + b"\\x08\\x02\\x00\\x00\\x00"
            output.write_bytes(b"\\x89PNG\\r\\n\\x1a\\n" + (13).to_bytes(4, "big") + b"IHDR" + ihdr + b"\\x00" * 300)
            OutputIntegrityValidator(10).validate(output)

    def test_partial_checkpoint_resumes_after_failure(self):
        class FailOnSecondFrame(Renderer):
            def render(self, spec, project, frame, output):
                if frame == 2:
                    raise RetryableWorkerError("simulated node interruption")
                output.write_bytes(b"PNG-safe-render-output-" + str(frame).encode())
                return output

        with tempfile.TemporaryDirectory() as tmp:
            checkpoint_root = Path(tmp) / "checkpoints"
            store = FilesystemCheckpointStore(checkpoint_root)
            with self.assertRaises(RetryableWorkerError):
                WorkerEngine(Path(tmp) / "work", Downloader(), BasicPreflight(),
                             FailOnSecondFrame(), store, BasicOutputValidator(10), Reporter()).run(spec())
            self.assertTrue(store.is_verified(spec(), 1))
            self.assertFalse(store.is_verified(spec(), 2))

            checkpoints, reporter = store, Reporter()
            WorkerEngine(Path(tmp) / "work", Downloader(), BasicPreflight(), Renderer(),
                         checkpoints, BasicOutputValidator(10), reporter).run(spec())
            self.assertIn(("complete", "task-1"), reporter.events)
            self.assertTrue(store.is_verified(spec(), 2))

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
