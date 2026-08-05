"""Windows path-boundary checks for disposable Worker workspaces."""
from __future__ import annotations

import os
from pathlib import Path


def reject_reparse_points(anchor: Path, candidate: Path) -> None:
    """Reject symlink/junction/reparse components before creating job data."""
    anchor = anchor.resolve()
    candidate = candidate.absolute()
    try:
        candidate.relative_to(anchor)
    except ValueError as exc:
        raise ValueError("path escaped workspace anchor") from exc
    current = anchor
    for part in candidate.relative_to(anchor).parts:
        current = current / part
        if current.exists() and os.path.islink(current):
            raise ValueError(f"reparse/symlink path component rejected: {current.name}")

