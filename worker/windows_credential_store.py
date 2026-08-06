"""Small Windows DPAPI-backed file store for the per-worker credential.

The file is only ciphertext. The installer must ACL the containing directory
to the dedicated Worker service account. DPAPI is user-scoped by default, so a
different Windows account cannot decrypt the file.
"""

from __future__ import annotations

import base64
import ctypes
import os
from pathlib import Path


class WindowsProtectedCredentialStore:
    def __init__(self, path: Path):
        if os.name != "nt":
            raise RuntimeError("Windows DPAPI credential store requires Windows")
        self.path = path

    def save(self, secret: str) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        protected = _protect(secret.encode("utf-8"))
        self.path.write_text(base64.b64encode(protected).decode("ascii"), encoding="ascii")

    def load(self) -> str:
        encoded = self.path.read_text(encoding="ascii").strip()
        return _unprotect(base64.b64decode(encoded)).decode("utf-8")


class _Blob(ctypes.Structure):
    _fields_ = [("cbData", ctypes.c_uint32), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]


def _protect(value: bytes) -> bytes:
    return _dpapi_call("CryptProtectData", value)


def _unprotect(value: bytes) -> bytes:
    return _dpapi_call("CryptUnprotectData", value)


def _dpapi_call(function: str, value: bytes) -> bytes:
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    operation = getattr(crypt32, function)
    operation.argtypes = [ctypes.POINTER(_Blob), ctypes.c_wchar_p,
                          ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                          ctypes.c_uint32, ctypes.POINTER(_Blob)]
    operation.restype = ctypes.c_int
    source_buffer = (ctypes.c_ubyte * len(value)).from_buffer_copy(value)
    source = _Blob(len(value), source_buffer)
    result = _Blob()
    if not operation(ctypes.byref(source), "CWS Worker credential", None, None,
                     None, 0x1, ctypes.byref(result)):
        raise OSError(ctypes.get_last_error(), f"{function} failed")
    try:
        return ctypes.string_at(result.pbData, result.cbData)
    finally:
        kernel32.LocalFree(result.pbData)
