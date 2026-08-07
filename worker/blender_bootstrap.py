"""Pinned, fail-closed Blender discovery/bootstrap for Windows Workers."""

from __future__ import annotations

import hashlib
import os
import shutil
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

from worker_engine import PermanentWorkerError


MAX_BLENDER_ARCHIVE_BYTES = 2 * 1024 * 1024 * 1024


def _safe_member(name: str) -> Path:
    normalized = name.replace("\\", "/")
    path = Path(normalized)
    if path.is_absolute() or "\x00" in normalized:
        raise PermanentWorkerError("Blender archive contains an unsafe path")
    if any(part in {"", ".", ".."} for part in path.parts):
        raise PermanentWorkerError("Blender archive contains path traversal")
    return path


def _find_executable(root: Path) -> Path | None:
    candidates = sorted(root.rglob("blender.exe"))
    return next((path for path in candidates if path.is_file()), None)


def _verify_sha256(path: Path, expected: str) -> None:
    if not expected or len(expected) != 64 or any(c not in "0123456789abcdefABCDEF" for c in expected):
        raise PermanentWorkerError("CWS_BLENDER_SHA256 must be a 64-character hex digest")
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    if digest.hexdigest().lower() != expected.lower():
        raise PermanentWorkerError("Blender archive SHA-256 mismatch")


def _download_archive(url: str, destination: Path, expected_sha256: str) -> None:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "download.blender.org":
        raise PermanentWorkerError("Blender download URL must be official HTTPS")
    partial = destination.with_suffix(destination.suffix + ".part")
    total = 0
    try:
        with urllib.request.urlopen(url, timeout=120) as response, partial.open("wb") as output:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_BLENDER_ARCHIVE_BYTES:
                    raise PermanentWorkerError("Blender archive exceeds safety limit")
                output.write(chunk)
        _verify_sha256(partial, expected_sha256)
        partial.replace(destination)
    except PermanentWorkerError:
        partial.unlink(missing_ok=True)
        raise
    except Exception as exc:
        partial.unlink(missing_ok=True)
        raise PermanentWorkerError("Blender download failed") from exc


def _extract_archive(archive: Path, root: Path) -> Path:
    staging = Path(tempfile.mkdtemp(prefix="blender-extract-", dir=str(root)))
    try:
        with zipfile.ZipFile(archive) as package:
            for member in package.infolist():
                relative = _safe_member(member.filename)
                target = (staging / relative).resolve()
                if not str(target).startswith(str(staging.resolve()) + os.sep):
                    raise PermanentWorkerError("Blender archive escaped extraction root")
                if member.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                if member.external_attr & 0o170000 == 0o120000:
                    raise PermanentWorkerError("Blender archive contains a symlink")
                target.parent.mkdir(parents=True, exist_ok=True)
                with package.open(member) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output, length=1024 * 1024)
        executable = _find_executable(staging)
        if executable is None:
            raise PermanentWorkerError("Blender archive has no blender.exe")
        final_root = root / "blender-installed"
        if final_root.exists():
            shutil.rmtree(final_root)
        staging.replace(final_root)
        return (final_root / executable.relative_to(staging)).resolve()
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise


def resolve_blender(
    explicit: Path | None,
    cache_root: Path,
    download_url: str | None = None,
    sha256: str | None = None,
) -> Path:
    """Find Blender or install one pinned official archive into the cache."""
    if explicit is not None:
        candidate = explicit.expanduser().resolve()
        if candidate.is_file() and candidate.name.lower() == "blender.exe":
            return candidate
        raise PermanentWorkerError("CWS_BLENDER_EXE does not point to blender.exe")

    cache_root = cache_root.expanduser().resolve()
    cache_root.mkdir(parents=True, exist_ok=True)
    cached = _find_executable(cache_root)
    if cached is not None:
        return cached.resolve()
    if not download_url or not sha256:
        raise PermanentWorkerError(
            "Blender is missing; configure official download URL and SHA-256"
        )
    archive = cache_root / "blender-pinned.zip"
    if not archive.exists():
        _download_archive(download_url, archive, sha256)
    else:
        _verify_sha256(archive, sha256)
    return _extract_archive(archive, cache_root)
