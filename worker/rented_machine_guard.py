"""Local Windows guard for the Founder-controlled Track A render lease.

V1.1 adds a conservative session allowlist: processes that already existed
when the lease was acquired are left alone, known CWS/admin applications are
allowed to start, and new interactive-session applications outside that
allowlist are terminated with a customer-facing rented-machine notice.
"""

from __future__ import annotations

import base64
import csv
import ctypes
import json
import os
import re
import subprocess
import threading
import time
from ctypes import wintypes
from pathlib import Path

ES_CONTINUOUS = 0x80000000
ES_SYSTEM_REQUIRED = 0x00000001
PROCESS_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,127}\.exe$")
CUSTOMER_NOTICE_COOLDOWN_SEC = 4.0
CUSTOMER_NOTICE_TEXT = (
    "Máy đang được CWS thuê.\r\n"
    "Xin quý khách vui lòng chọn máy khác.\r\n"
    "Xin cảm ơn."
)
NEVER_TERMINATE = {
    "blender.exe", "python.exe", "pythonw.exe", "powershell.exe", "pwsh.exe",
    "cmd.exe", "conhost.exe", "explorer.exe", "csrss.exe", "dwm.exe",
    "services.exe", "svchost.exe", "wininit.exe", "winlogon.exe", "lsass.exe",
}


class RentedMachineGuard:
    """Own and release one local render lease on Windows."""

    def __init__(self, base_dir: Path, policy_path: Path | None = None, poll_seconds: float = 1.0):
        if os.name != "nt":
            raise RuntimeError("RENTED_MACHINE_GUARD_V1 requires Windows")
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.lease_path = self.base_dir / "rented_machine_lease.json"
        self.log_path = self.base_dir / "rented_machine_guard.log"
        self.policy_path = Path(policy_path) if policy_path else self.base_dir / "rented_machine_guard_policy.json"
        self.poll_seconds = max(1.0, float(poll_seconds))
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._ui: subprocess.Popen[str] | None = None
        self._lease: dict[str, object] | None = None
        self._console_hwnd = None
        self._last_customer_notice_at = 0.0
        self._baseline_pids: set[int] = set()
        self._kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        self._user32 = ctypes.WinDLL("user32", use_last_error=True)

    def acquire(self, lease_id: str, job_id: str, worker_process_id: int) -> None:
        stale = self._read_lease()
        if stale and stale.get("state") not in ("RELEASE", "AVAILABLE"):
            old_pid = int(stale.get("worker_process_id") or 0)
            if old_pid and self._pid_alive(old_pid):
                raise RuntimeError("another active CWS rented-machine lease already exists")
            self._event("stale_lease_recovered", previous_lease_id=stale.get("lease_id"))
            self.lease_path.unlink(missing_ok=True)

        # Preserve services, cafe-management software, antivirus and other
        # machine-specific background processes that already existed before
        # CWS acquired the render lease. Explicit blocked game launchers are
        # still removed below even if they existed in this snapshot.
        self._baseline_pids = {item[1] for item in self._enumerate_processes()}

        self._lease = {
            "lease_id": self._safe_id(lease_id),
            "job_id": self._safe_id(job_id),
            "worker_process_id": int(worker_process_id),
            "blender_process_id": None,
            "started_at": time.time(),
            "last_seen_at": time.time(),
            "state": "RENTED_LOCK",
        }
        self._write_lease()
        self._set_system_required(True)
        self._block_shutdown(True)
        self._start_notice()

        if not self._clear_configured_game_conflicts(timeout_seconds=12.0):
            remaining = sorted(self._list_running_blocked_processes())
            self._event("game_conflict_unresolved", processes=remaining)
            self.release("game_conflict")
            raise RuntimeError("configured game process is still running; render lease was released")

        self._thread = threading.Thread(target=self._run, name="cws-rented-machine-guard", daemon=True)
        self._thread.start()
        self._event("lease_acquired", lease_id=self._lease["lease_id"], job_id=self._lease["job_id"])

    def set_state(self, state: str) -> None:
        if self._lease is None:
            return
        if state not in {"RENTED_LOCK", "RENDERING", "FINALIZING", "RECOVERY", "RELEASE"}:
            raise ValueError(f"unsupported guard state: {state}")
        self._lease["state"] = state
        self._lease["last_seen_at"] = time.time()
        self._write_lease()
        self._event("state_changed", state=state)

    def set_blender_pid(self, pid: int | None) -> None:
        if self._lease is not None:
            self._lease["blender_process_id"] = int(pid) if pid else None
            self._lease["last_seen_at"] = time.time()
            self._write_lease()

    def release(self, reason: str = "completed") -> None:
        if self._lease is None:
            return
        lease_id = self._lease.get("lease_id")
        self._lease["state"] = "RELEASE"
        self._lease["last_seen_at"] = time.time()
        self._write_lease()
        self._stop.set()
        if self._thread and self._thread is not threading.current_thread():
            self._thread.join(timeout=5)
        self._close_notice()
        self._block_shutdown(False)
        self._set_system_required(False)
        self.lease_path.unlink(missing_ok=True)
        self._event("lease_released", lease_id=lease_id, reason=self._safe_id(reason))
        self._lease = None
        self._thread = None
        self._baseline_pids.clear()

    def _run(self) -> None:
        last_write = 0.0
        while not self._stop.wait(self.poll_seconds):
            self._set_system_required(True)
            self._enforce_session_allowlist()
            now = time.time()
            if self._lease and now - last_write >= 10:
                self._lease["last_seen_at"] = now
                self._write_lease()
                last_write = now

    def _enumerate_processes(self) -> list[tuple[str, int, str]]:
        """Return (image_name, pid, session_name) from supported tasklist."""
        try:
            result = subprocess.run(
                ["tasklist", "/FO", "CSV", "/NH"],
                capture_output=True, text=True, timeout=5, check=False,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            values: list[tuple[str, int, str]] = []
            for row in csv.reader(result.stdout.splitlines()):
                if len(row) < 4:
                    continue
                name = row[0].strip().lower()
                pid_text = row[1].strip()
                session_name = row[2].strip().lower()
                if pid_text.isdigit():
                    values.append((name, int(pid_text), session_name))
            return values
        except (OSError, subprocess.SubprocessError) as exc:
            self._event("process_policy_error", error=type(exc).__name__)
            return []

    def _load_policy(self) -> dict[str, object]:
        try:
            data = json.loads(self.policy_path.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError, TypeError):
            return {}

    def _load_process_set(self, key: str) -> set[str]:
        values = self._load_policy().get(key, [])
        if not isinstance(values, list):
            return set()
        return {
            value.strip().lower()
            for value in values
            if isinstance(value, str) and PROCESS_NAME_RE.fullmatch(value.strip().lower())
        }

    def _load_blocked_processes(self) -> set[str]:
        return self._load_process_set("blocked_processes")

    def _load_allowed_processes(self) -> set[str]:
        return self._load_process_set("allowed_processes") | NEVER_TERMINATE

    def _session_allowlist_enabled(self) -> bool:
        return self._load_policy().get("mode") == "session_allowlist"

    def _is_interactive_session(self, session_name: str) -> bool:
        # Windows service/session-0 processes are not customer applications.
        value = (session_name or "").strip().lower()
        return value not in {"", "services", "service", "0"}

    def _terminate_pid(self, name: str, pid: int, event_name: str) -> None:
        if pid == os.getpid() or name in NEVER_TERMINATE:
            return
        self._show_customer_rented_notice(name)
        stop = subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            capture_output=True, text=True, timeout=5, check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        self._event(event_name, process=name, pid=pid, exit_code=stop.returncode)

    def _enforce_session_allowlist(self) -> None:
        blocked = self._load_blocked_processes()
        allowed = self._load_allowed_processes()
        allowlist_mode = self._session_allowlist_enabled()

        for name, pid, session_name in self._enumerate_processes():
            if name in NEVER_TERMINATE or pid == os.getpid():
                continue

            # Explicit blacklist always wins, including launchers that were
            # already running before CWS acquired the machine.
            if name in blocked:
                self._terminate_pid(name, pid, "configured_process_terminated")
                continue

            if not allowlist_mode:
                continue
            if name in allowed:
                continue
            if pid in self._baseline_pids:
                continue
            if not self._is_interactive_session(session_name):
                continue

            self._event("session_allowlist_blocked", process=name, pid=pid, session=session_name)
            self._terminate_pid(name, pid, "session_process_terminated")

    def _list_running_blocked_processes(self) -> set[str]:
        blocked = self._load_blocked_processes()
        return {
            name
            for name, pid, _session in self._enumerate_processes()
            if name in blocked and name not in NEVER_TERMINATE and pid != os.getpid()
        }

    def _clear_configured_game_conflicts(self, timeout_seconds: float) -> bool:
        deadline = time.monotonic() + max(1.0, timeout_seconds)
        first = self._list_running_blocked_processes()
        if not first:
            return True
        self._event("game_conflict_detected", processes=sorted(first))
        self._show_customer_rented_notice(next(iter(sorted(first))))
        while time.monotonic() < deadline:
            self._enforce_session_allowlist()
            remaining = self._list_running_blocked_processes()
            if not remaining:
                self._event("game_conflict_cleared")
                return True
            time.sleep(0.5)
        return not self._list_running_blocked_processes()

    def _show_customer_rented_notice(self, process_name: str) -> None:
        now = time.monotonic()
        if now - self._last_customer_notice_at < CUSTOMER_NOTICE_COOLDOWN_SEC:
            return
        self._last_customer_notice_at = now
        message = CUSTOMER_NOTICE_TEXT.replace("'", "''")
        script = f"""
Add-Type -AssemblyName System.Windows.Forms
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.ShowInTaskbar = $false
$owner.WindowState = 'Minimized'
$owner.Opacity = 0
$owner.Show()
[System.Windows.Forms.MessageBox]::Show(
  $owner,
  '{message}',
  'CWS - Máy đang được thuê',
  [System.Windows.Forms.MessageBoxButtons]::OK,
  [System.Windows.Forms.MessageBoxIcon]::Information
) | Out-Null
$owner.Close()
"""
        encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
        try:
            subprocess.Popen(
                ["powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", encoded],
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0), text=True,
            )
            self._event("customer_rented_notice_shown", process=self._safe_id(process_name))
        except OSError:
            self._event("customer_rented_notice_unavailable", process=self._safe_id(process_name))

    def _start_notice(self) -> None:
        job = str(self._lease.get("job_id", "")) if self._lease else ""
        path = str(self.lease_path).replace("'", "''")
        script = f"""
Add-Type -AssemblyName System.Windows.Forms
$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = 'None'; $form.WindowState = 'Maximized'; $form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(18,18,18)
$label = New-Object System.Windows.Forms.Label
$label.Dock = 'Fill'; $label.TextAlign = 'MiddleCenter'; $label.ForeColor = [System.Drawing.Color]::White
$label.Font = New-Object System.Drawing.Font('Segoe UI', 28, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($label)
$timer = New-Object System.Windows.Forms.Timer; $timer.Interval = 1000
$timer.Add_Tick({{
  try {{ $j = Get-Content -LiteralPath '{path}' -Raw | ConvertFrom-Json; $elapsed = ([DateTimeOffset]::Now - [DateTimeOffset]::FromUnixTimeSeconds([int64]$j.started_at)).ToString('hh\\:mm\\:ss'); $label.Text = "MÁY ĐANG ĐƯỢC CWS THUÊ`n`nXin quý khách vui lòng chọn máy khác.`nXin cảm ơn.`n`nTrạng thái: $($j.state)`nJob: {job}`nThời gian: $elapsed" }} catch {{ $form.Close() }}
}})
$timer.Start(); [System.Windows.Forms.Application]::Run($form)
"""
        encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
        try:
            self._ui = subprocess.Popen(
                ["powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-EncodedCommand", encoded],
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0), text=True,
            )
        except OSError:
            self._event("notice_unavailable")

    def _close_notice(self) -> None:
        if self._ui is None:
            return
        if self._ui.poll() is None:
            self._ui.terminate()
            try:
                self._ui.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._ui.kill()
        self._ui = None

    def _set_system_required(self, active: bool) -> None:
        flags = ES_CONTINUOUS | (ES_SYSTEM_REQUIRED if active else 0)
        try:
            self._kernel32.SetThreadExecutionState(flags)
        except (AttributeError, OSError):
            self._event("power_request_unavailable")

    def _block_shutdown(self, active: bool) -> None:
        try:
            self._kernel32.GetConsoleWindow.restype = wintypes.HWND
            self._console_hwnd = self._kernel32.GetConsoleWindow()
            if not self._console_hwnd:
                return
            if active:
                self._user32.ShutdownBlockReasonCreate(self._console_hwnd, "CWS dang render cong viec")
            else:
                self._user32.ShutdownBlockReasonDestroy(self._console_hwnd)
        except (AttributeError, OSError):
            self._event("shutdown_block_unavailable")

    def _read_lease(self) -> dict[str, object] | None:
        try:
            value = json.loads(self.lease_path.read_text(encoding="utf-8"))
            return value if isinstance(value, dict) else None
        except (OSError, ValueError):
            return None

    def _write_lease(self) -> None:
        if self._lease is None:
            return
        temp = self.lease_path.with_suffix(".json.tmp")
        temp.write_text(json.dumps(self._lease, sort_keys=True), encoding="utf-8")
        temp.replace(self.lease_path)

    def _event(self, event: str, **fields: object) -> None:
        payload = {"event": event, "ts": time.time(), **fields}
        try:
            with self.log_path.open("a", encoding="utf-8") as stream:
                stream.write(json.dumps(payload, sort_keys=True) + "\n")
        except OSError:
            pass

    @staticmethod
    def _pid_alive(pid: int) -> bool:
        if pid <= 0:
            return False
        try:
            os.kill(pid, 0)
            return True
        except (OSError, ValueError):
            return False

    @staticmethod
    def _safe_id(value: object) -> str:
        return re.sub(r"[^A-Za-z0-9_.-]", "_", str(value))[:128]

    def __enter__(self) -> "RentedMachineGuard":
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        self.release("exception" if exc_type else "completed")
