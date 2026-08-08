import tempfile
import unittest
import zipfile
from unittest.mock import patch
import subprocess
from pathlib import Path

from worker_engine import (BasicOutputValidator, BasicPreflight, JobSpec,
                           FailureCategory, PermanentWorkerError,
                           FilesystemCheckpointStore, RetryableWorkerError, WorkerEngine,
                           OutputIntegrityValidator, classify_blender_failure,
                           _parse_rar_listing)
from worker_engine import BlenderCliRenderer


class Downloader:
    def download(self, spec, destination):
        path = destination / "project.blend"
        path.write_bytes(b"safe blend fixture")
        return path


class ZipDownloader:
    def __init__(self, members):
        self.members = members

    def download(self, spec, destination):
        path = destination / "project.zip"
        with zipfile.ZipFile(path, "w") as archive:
            for name, content in self.members:
                archive.writestr(name, content)
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


class RecordingPreparer:
    def prepare(self, project, job_root):
        target = job_root / "working_copy" / "project.blend"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(project.read_bytes())
        return target


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
    def test_blender_renderer_attaches_owned_process_to_job_object(self):
        class CompletedProcess:
            pid = 12345
            _handle = 67890
            returncode = 0

            def communicate(self, timeout):
                output.write_bytes(b"rendered")
                return "", ""

        with tempfile.TemporaryDirectory() as tmp:
            executable = Path(tmp) / "blender.exe"
            executable.write_bytes(b"fixture")
            project = Path(tmp) / "project.blend"
            project.write_bytes(b"safe blend")
            output = Path(tmp) / "frame_0001.png"
            process = CompletedProcess()
            with (
                patch("worker_engine.subprocess.Popen", return_value=process),
                patch("worker_engine.WindowsJobObject") as job_type,
            ):
                result = BlenderCliRenderer(executable, use_job_object=True).render(
                    spec(), project, 1, output
                )
            job_type.return_value.assign.assert_called_once_with(process)
            job_type.return_value.close.assert_called_once_with()
            self.assertEqual(result, output)

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
            with (
                patch("worker_engine.subprocess.Popen", return_value=process),
                patch.object(renderer, "_terminate_tree") as terminate,
            ):
                with self.assertRaises(RetryableWorkerError):
                    renderer.render(spec(), project, 1, Path(tmp) / "frame_0001.png")
                terminate.assert_called_once_with(process)

    def test_output_integrity_rejects_truncated_png(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "frame_0001.png"
            output.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 300)
            with self.assertRaises(RetryableWorkerError):
                OutputIntegrityValidator(10).validate(output)

    def test_output_integrity_accepts_structurally_valid_png_header(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "frame_0001.png"
            ihdr = (1920).to_bytes(4, "big") + (1080).to_bytes(4, "big") + b"\x08\x02\x00\x00\x00"
            output.write_bytes(b"\x89PNG\r\n\x1a\n" + (13).to_bytes(4, "big") + b"IHDR" + ihdr + b"\x00" * 300)
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

    def test_capability_preflight_rejects_insufficient_vram(self):
        project = Path(tempfile.mkdtemp()) / "project.blend"
        try:
            project.write_bytes(b"safe blend")
            requested = spec(required_vram_mb=8192)
            with self.assertRaisesRegex(PermanentWorkerError, "VRAM"):
                BasicPreflight({"vram_mb": 4096}).inspect(requested, project)
        finally:
            project.unlink(missing_ok=True)

    def test_capability_preflight_accepts_sufficient_resources(self):
        project = Path(tempfile.mkdtemp()) / "project.blend"
        try:
            project.write_bytes(b"safe blend")
            requested = spec(required_vram_mb=4096, required_ram_mb=16384)
            BasicPreflight({"vram_mb": 8192, "ram_mb": 32768}).inspect(requested, project)
        finally:
            project.unlink(missing_ok=True)

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

    def test_output_prefix_path_traversal_is_rejected(self):
        with self.assertRaisesRegex(PermanentWorkerError, "invalid output_prefix"):
            spec(output_prefix="renders/../outside")

    def test_zip_input_extracts_one_blend_and_preserves_relative_assets(self):
        with tempfile.TemporaryDirectory() as tmp:
            checkpoints, reporter = Checkpoints(), Reporter()
            engine = WorkerEngine(
                Path(tmp),
                ZipDownloader([
                    ("scene/main.blend", b"blend"),
                    ("scene/textures/wall.png", b"texture"),
                ]),
                BasicPreflight(), Renderer(), checkpoints,
                BasicOutputValidator(10), reporter,
            )
            engine.run(spec(frame_end=1))
            self.assertIn(("complete", "task-1"), reporter.events)
            self.assertFalse((Path(tmp) / "task-1").exists())

    def test_zip_slip_is_rejected_and_workspace_is_cleaned(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(PermanentWorkerError, "path traversal"):
                WorkerEngine(
                    Path(tmp), ZipDownloader([
                        ("../escape.blend", b"blend"),
                    ]), BasicPreflight(), Renderer(), Checkpoints(),
                    BasicOutputValidator(10), Reporter(),
                ).run(spec(frame_end=1))
            self.assertFalse((Path(tmp) / "escape.blend").exists())
            self.assertFalse((Path(tmp) / "task-1").exists())

    def test_zip_requires_exactly_one_blend_file(self):
        for members, expected in (
            ([('readme.txt', b'no scene')], "found 0"),
            ([('a.blend', b'a'), ('b.blend', b'b')], "found 2"),
        ):
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as tmp:
                with self.assertRaisesRegex(PermanentWorkerError, expected):
                    WorkerEngine(
                        Path(tmp), ZipDownloader(members), BasicPreflight(), Renderer(),
                        Checkpoints(), BasicOutputValidator(10), Reporter(),
                    ).run(spec(frame_end=1))

    def test_rar_listing_rejects_archive_bomb_and_links(self):
        archive_header = "Path = fixture.rar\nType = Rar5\n\n"
        bomb = archive_header + (
            "Path = scene.blend\nType = \nSize = 2000000\nPacked Size = 1\n\n"
        )
        with self.assertRaisesRegex(PermanentWorkerError, "compression ratio"):
            _parse_rar_listing(bomb)

        link = archive_header + (
            "Path = scene.blend\nType = Link\nSize = 10\nPacked Size = 10\n\n"
        )
        with self.assertRaisesRegex(PermanentWorkerError, "links"):
            _parse_rar_listing(link)

    def test_rar_listing_rejects_traversal_and_nested_archive(self):
        header = "Path = fixture.rar\nType = Rar5\n\n"
        traversal = header + "Path = ../scene.blend\nSize = 10\nPacked Size = 10\n\n"
        with self.assertRaisesRegex(PermanentWorkerError, "path traversal"):
            _parse_rar_listing(traversal)
        nested = header + "Path = assets/project.zip\nSize = 10\nPacked Size = 10\n\n"
        with self.assertRaisesRegex(PermanentWorkerError, "nested"):
            _parse_rar_listing(nested)

    def test_safe_preparation_renders_only_working_copy(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "source.blend"
            source.write_bytes(b"immutable blend")
            seen = []

            class RendererThatRecords(Renderer):
                def render(self, current_spec, project, frame, output):
                    seen.append(project)
                    return super().render(current_spec, project, frame, output)

            WorkerEngine(
                Path(tmp) / "work", Downloader(), BasicPreflight(),
                RendererThatRecords(), Checkpoints(), BasicOutputValidator(10),
                Reporter(), preparer=RecordingPreparer(),
            ).run(spec(frame_end=1))
            self.assertEqual(seen[0].name, "project.blend")
            self.assertNotEqual(seen[0].parent.name, "task-1")

    def test_zip_symlink_entry_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            class SymlinkDownloader:
                def download(self, current_spec, destination):
                    path = destination / "project.zip"
                    info = zipfile.ZipInfo("scene.blend")
                    info.create_system = 3
                    info.external_attr = (0o120777 << 16) | 0xA000
                    with zipfile.ZipFile(path, "w") as archive:
                        archive.writestr(info, "target")
                    return path
            with self.assertRaisesRegex(PermanentWorkerError, "symlinks"):
                WorkerEngine(
                    Path(tmp), SymlinkDownloader(), BasicPreflight(), Renderer(), Checkpoints(),
                    BasicOutputValidator(10), Reporter(),
                ).run(spec(frame_end=1))

    def test_lease_guard_is_checked_before_checkpoint_upload(self):
        class RejectBeforeUpload(Guard):
            def __init__(self):
                super().__init__()
                self.assertions = 0

            def assert_active(self, current_spec):
                self.assertions += 1
                if self.assertions >= 3:
                    raise PermanentWorkerError("stale fencing generation")

        class CheckpointsThatMustNotWrite(Checkpoints):
            def put(self, current_spec, frame, output):
                raise AssertionError("stale attempt reached checkpoint storage")

        with tempfile.TemporaryDirectory() as tmp:
            guard = RejectBeforeUpload()
            with self.assertRaises(PermanentWorkerError):
                WorkerEngine(Path(tmp), Downloader(), BasicPreflight(), Renderer(),
                             CheckpointsThatMustNotWrite(), BasicOutputValidator(10),
                             Reporter(), guard).run(spec(frame_end=1))
            self.assertFalse((Path(tmp) / "task-1").exists())

    def test_lease_guard_is_checked_before_final_completion(self):
        class RejectBeforeComplete(Guard):
            def assert_active(self, current_spec):
                self.events.append("assert")
                if "CHECKPOINTED" in self.events:
                    raise PermanentWorkerError("stale fencing generation")

        with tempfile.TemporaryDirectory() as tmp:
            guard = RejectBeforeComplete()
            reporter = Reporter()
            with self.assertRaises(PermanentWorkerError):
                WorkerEngine(
                    Path(tmp), Downloader(), BasicPreflight(), Renderer(),
                    Checkpoints(), BasicOutputValidator(10), reporter, guard,
                ).run(spec(frame_end=1))
            self.assertNotIn(("complete", "task-1"), reporter.events)


if __name__ == "__main__":
    unittest.main()
