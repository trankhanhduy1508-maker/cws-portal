"""Real Windows SCM host for the Node Agent staging PoC.

The service owns presence/heartbeat and supervision only. A user-session
Worker launcher can be supplied with CWS_SERVICE_HELPER_COMMAND when GPU/UI
constraints make Session 0 unsuitable; Blender is never launched implicitly
by this service host.
"""
from __future__ import annotations

import json
import os
import shlex
import subprocess
import threading
import time
from pathlib import Path

import servicemanager
import win32event
import win32service
import win32serviceutil


class CwsNodeAgentService(win32serviceutil.ServiceFramework):
    _svc_name_ = "CWSNodeAgentStaging"
    _svc_display_name_ = "CWS Node Agent (Staging PoC)"
    _svc_description_ = "Staging-only CWS Node Agent SCM lifecycle and heartbeat PoC."
    _max_log_bytes = 5 * 1024 * 1024

    def __init__(self, args):
        super().__init__(args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.stop_requested = threading.Event()
        self.child = None
        default_log = Path(os.environ.get("ProgramData", r"C:\ProgramData")) / "CWS" / "cws-service-events.jsonl"
        self.log_path = Path(os.environ.get("CWS_SERVICE_LOG", str(default_log)))

    def _event(self, event: str, **fields: object) -> None:
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        if self.log_path.exists() and self.log_path.stat().st_size >= self._max_log_bytes:
            rotated = self.log_path.with_name(f"{self.log_path.name}.1")
            if rotated.exists():
                rotated.unlink()
            self.log_path.replace(rotated)
        payload = {"event": event, "ts": time.time(), **fields}
        with self.log_path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(payload, sort_keys=True) + "\n")

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.stop_requested.set()
        win32event.SetEvent(self.stop_event)
        if self.child is not None and self.child.poll() is None:
            self.child.terminate()
        self._event("service_stop_requested")

    def SvcDoRun(self):
        self._event("service_started", state="ACTIVE_IDLE")
        self._run_loop()
        self._event("service_stopped", state="ACTIVE_IDLE")

    def _run_loop(self):
        helper = os.environ.get("CWS_SERVICE_HELPER_COMMAND", "").strip()
        helper_args = shlex.split(helper, posix=False) if helper else None
        next_heartbeat = 0.0
        while not self.stop_requested.is_set():
            now = time.monotonic()
            if now >= next_heartbeat:
                self._event("heartbeat", state="ACTIVE_IDLE", health="service_alive")
                next_heartbeat = now + 5.0
            if helper_args and self.child is None:
                self.child = subprocess.Popen(helper_args, shell=False)
                self._event("helper_started", pid=self.child.pid)
            if self.child is not None and self.child.poll() is not None:
                self._event("helper_exit", code=self.child.returncode)
                self.child = None
            win32event.WaitForSingleObject(self.stop_event, 500)


if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(CwsNodeAgentService)
