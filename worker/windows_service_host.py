"""Windows SCM owner for the canonical CWS production Node Agent.

The service is the single automatic startup owner. It supervises the existing
``production_node_agent.py`` process; the Node Agent owns authentication,
heartbeat, task polling, and task-scoped Worker Engine launch. No synthetic
heartbeat and no legacy Worker fallback are allowed here.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

import servicemanager
import win32event
import win32service
import win32serviceutil


class CwsNodeAgentService(win32serviceutil.ServiceFramework):
    _svc_name_ = "CWSNodeAgentProduction"
    _svc_display_name_ = "CWS Node Agent (Production)"
    _svc_description_ = "Canonical CWS Node Agent production runtime owner."
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
            try:
                self.child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.child.kill()
        self._event("service_stop_requested")

    def SvcDoRun(self):
        self._event("service_started", state="STARTING", runtime="production_node_agent.py")
        self._run_loop()
        self._event("service_stopped", state="STOPPED")

    def _run_loop(self):
        python_exe = os.environ.get("CWS_PYTHON_EXE", sys.executable).strip() or sys.executable
        script = os.environ.get("CWS_NODE_AGENT_SCRIPT", "").strip()
        if not script:
            script = str(Path(__file__).resolve().with_name("production_node_agent.py"))
        if not Path(python_exe).is_file() or not Path(script).is_file():
            raise RuntimeError("canonical Node Agent executable or script is missing")
        self.child = subprocess.Popen([python_exe, script], shell=False)
        self._event("node_agent_started", pid=self.child.pid, script=script)
        while not self.stop_requested.is_set():
            result = self.child.poll()
            if result is not None:
                self._event("node_agent_exit", code=result)
                raise RuntimeError(f"canonical Node Agent exited with code {result}")
            win32event.WaitForSingleObject(self.stop_event, 500)


if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(CwsNodeAgentService)
