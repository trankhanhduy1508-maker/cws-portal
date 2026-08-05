"""Alternative Windows Job Object isolation POC; staging/local only."""
from __future__ import annotations

import argparse
import ctypes
import os
import subprocess
import sys
import time
from ctypes import wintypes
from pathlib import Path

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
kernel32.CreateJobObjectW.restype = wintypes.HANDLE
kernel32.SetInformationJobObject.restype = wintypes.BOOL
kernel32.AssignProcessToJobObject.restype = wintypes.BOOL
kernel32.ResumeThread.restype = wintypes.DWORD
kernel32.TerminateJobObject.restype = wintypes.BOOL
kernel32.CloseHandle.restype = wintypes.BOOL

JOB_OBJECT_EXTENDED_LIMIT_INFORMATION = 9
JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000
class BasicLimitInformation(ctypes.Structure):
    _fields_ = [("PerProcessUserTimeLimit", ctypes.c_longlong), ("PerJobUserTimeLimit", ctypes.c_longlong),
                ("LimitFlags", wintypes.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
                ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
                ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD), ("SchedulingClass", wintypes.DWORD)]


class IoCounters(ctypes.Structure):
    _fields_ = [("ReadOperationCount", ctypes.c_ulonglong), ("WriteOperationCount", ctypes.c_ulonglong),
                ("OtherOperationCount", ctypes.c_ulonglong), ("ReadTransferCount", ctypes.c_ulonglong),
                ("WriteTransferCount", ctypes.c_ulonglong), ("OtherTransferCount", ctypes.c_ulonglong)]


class ExtendedLimitInformation(ctypes.Structure):
    _fields_ = [("BasicLimitInformation", BasicLimitInformation), ("IoInfo", IoCounters),
                ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t)]


def check(ok: bool, name: str) -> None:
    if not ok:
        raise ctypes.WinError(ctypes.get_last_error(), name)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeout", type=float, default=2.0)
    ap.add_argument("--root", required=True)
    args = ap.parse_args()
    root = Path(args.root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    outside = root.parent / "isolation_poc_outside_attempt.txt"
    env = os.environ.copy()
    env.update(CWS_ISO_ALLOWED_DIR=str(root), CWS_ISO_OUTSIDE_PATH=str(outside))
    job = kernel32.CreateJobObjectW(None, None)
    check(bool(job), "CreateJobObjectW")
    proc = None
    try:
        info = ExtendedLimitInformation()
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        check(kernel32.SetInformationJobObject(job, JOB_OBJECT_EXTENDED_LIMIT_INFORMATION, ctypes.byref(info), ctypes.sizeof(info)), "SetInformationJobObject")
        fixture = Path(__file__).with_name("isolation_poc_fixture.py")
        proc = subprocess.Popen([sys.executable, str(fixture)], env=env)
        check(kernel32.AssignProcessToJobObject(job, wintypes.HANDLE(proc._handle)), "AssignProcessToJobObject")
        (root / "start.gate").write_text("assigned\n", encoding="utf-8")
        time.sleep(args.timeout)
        check(kernel32.TerminateJobObject(job, 124), "TerminateJobObject")
        proc.wait(timeout=5)
        print(f"fixture_exit={proc.returncode}")
        print(f"allowed_markers={sorted(p.name for p in root.glob('*.txt'))}")
        print(f"outside_write_exists={outside.exists()}")
        return 0
    finally:
        if proc is not None and proc.poll() is None:
            proc.kill()
        kernel32.CloseHandle(job)


if __name__ == "__main__":
    raise SystemExit(main())
