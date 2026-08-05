"""Harmless hostile-style fixture for the staging isolation POC."""
from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from pathlib import Path

root = Path(os.environ["CWS_ISO_ALLOWED_DIR"])
outside = Path(os.environ["CWS_ISO_OUTSIDE_PATH"])
gate = root / "start.gate"
while not gate.exists():
    time.sleep(0.02)
(root / "fixture_started.txt").write_text("started\n", encoding="utf-8")
try:
    outside.write_text("outside-write-attempt\n", encoding="utf-8")
except OSError as exc:
    (root / "outside_write_blocked.txt").write_text(type(exc).__name__, encoding="utf-8")
try:
    with socket.create_connection(("127.0.0.1", 9), timeout=0.2):
        (root / "network_reached.txt").write_text("unexpected\n", encoding="utf-8")
except OSError:
    (root / "network_blocked_or_closed.txt").write_text("no-loopback-service\n", encoding="utf-8")
(root / "autoexec_attempt.txt").write_text("harmless marker only\n", encoding="utf-8")
child = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(600)"])
(root / "child_pid.txt").write_text(str(child.pid), encoding="utf-8")
time.sleep(600)
