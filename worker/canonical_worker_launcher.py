"""Pinned, non-bootstrap launcher contract for the canonical CWS Worker.

This module does not start a Worker at import time. It validates a staging
package before launch and invokes the repository's single launcher only when
the caller explicitly asks it to. It never installs packages, changes ACLs,
or calls Windows power APIs.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Sequence


class ArtifactValidationError(ValueError):
    """Raised when a Worker package is not the expected pinned artifact."""


@dataclass(frozen=True)
class WorkerArtifact:
    package_root: Path
    entrypoint: str = "cws_worker_full.py"
    launcher: str = "cws_worker.bat"
    manifest: str = "worker-artifact-manifest.json"
    expected_version: str = "1.18.0"


def _safe_child(root: Path, relative: str) -> Path:
    candidate = (root / relative).resolve()
    if candidate.parent != root.resolve() or candidate.name != relative:
        raise ArtifactValidationError(f"artifact path must be a direct child: {relative}")
    return candidate


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class PinnedWorkerLauncher:
    """Validate and explicitly launch one pinned canonical Worker package."""

    def __init__(self, artifact: WorkerArtifact):
        self.artifact = artifact
        self.root = artifact.package_root.resolve()

    def validate(self) -> Mapping[str, str]:
        if not self.root.is_dir():
            raise ArtifactValidationError(f"package root does not exist: {self.root}")
        manifest_path = _safe_child(self.root, self.artifact.manifest)
        entrypoint = _safe_child(self.root, self.artifact.entrypoint)
        launcher = _safe_child(self.root, self.artifact.launcher)
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ArtifactValidationError("invalid Worker artifact manifest") from exc
        if manifest.get("version") != self.artifact.expected_version:
            raise ArtifactValidationError("Worker version does not match the pinned version")
        files = manifest.get("files")
        if not isinstance(files, dict):
            raise ArtifactValidationError("manifest.files must be an object")
        for name, expected in files.items():
            path = _safe_child(self.root, str(name))
            if not path.is_file() or _sha256(path).lower() != str(expected).lower():
                raise ArtifactValidationError(f"checksum mismatch: {name}")
        if not entrypoint.is_file() or not launcher.is_file():
            raise ArtifactValidationError("canonical Worker entrypoint/launcher is missing")
        return {
            "version": str(manifest["version"]),
            "entrypoint": str(entrypoint),
            "launcher": str(launcher),
        }

    def command(self, extra_args: Sequence[str] = ()) -> list[str]:
        self.validate()
        if os.name != "nt":
            raise ArtifactValidationError("canonical .bat launcher requires Windows")
        # The .bat is the only supervisor. Do not add a second restart loop.
        return [
            "cmd.exe",
            "/d",
            "/s",
            "/c",
            str(_safe_child(self.root, self.artifact.launcher)),
            *extra_args,
        ]

    def launch(self, extra_args: Sequence[str] = ()) -> subprocess.Popen:
        command = self.command(extra_args)
        return subprocess.Popen(command, cwd=self.root, shell=False)
