"""Recovery-only offline provisioning helper for one CWS Worker identity.

Default behavior writes the token into a Windows DPAPI store and writes only
the SHA-256 hash as SQL. It never prints the plaintext token. Run this on the
Worker host under the dedicated least-privilege service account; apply the SQL
through the approved backend/database process, never by pasting a token into
chat, Git, or logs. Normal Architecture V1 fleet growth must use
``enroll_worker_identity.py`` and the Backend ticket flow instead of SQL.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import secrets
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Portable/embedded Python builds may omit the script directory from sys.path.
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from windows_credential_store import WindowsProtectedCredentialStore


_SAFE_WORKER_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def credential_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def stable_worker_id(machine_guid: str) -> str:
    """Derive a stable, non-secret ID from a provisioned Windows host."""
    normalized = machine_guid.strip().lower()
    if not normalized:
        raise ValueError("Windows MachineGuid is empty")
    digest = hashlib.sha256(f"cws-worker-v1:{normalized}".encode("utf-8")).hexdigest()
    return f"CWS-{digest[:16].upper()}"


def windows_machine_guid() -> str:
    try:
        import winreg
        with winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Cryptography",
            access=winreg.KEY_READ | winreg.KEY_WOW64_64KEY,
        ) as key:
            return str(winreg.QueryValueEx(key, "MachineGuid")[0])
    except (ImportError, OSError) as exc:
        raise RuntimeError("could not read Windows MachineGuid") from exc


def _sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql_for_identity(
    worker_id: str,
    token: str,
    expires_at: datetime,
    *,
    fleet_id: int = 2,
    gpu_name: str | None = None,
    vram_mb: int = 0,
) -> str:
    """Return hash-only, idempotent Worker registry + identity SQL."""
    safe_worker_id = worker_id.replace("'", "''")
    gpu_sql = "null" if not gpu_name else _sql_text(gpu_name[:240])
    return (
        "begin;\n"
        "insert into public.workers "
        "(worker_id, fleet_id, gpu_name, vram_mb, status, observed_state, health_state) values ("
        f"'{safe_worker_id}', {int(fleet_id)}, {gpu_sql}, {int(vram_mb)}, "
        "'offline', 'INITIALIZING', 'UNKNOWN') "
        "on conflict (worker_id) do nothing;\n"
        "insert into public.worker_identities "
        "(worker_id, credential_hash, status, expires_at) values ("
        f"'{safe_worker_id}', '{credential_hash(token)}', 'active', "
        f"'{expires_at.astimezone(timezone.utc).isoformat()}') "
        "on conflict (worker_id) do update set credential_hash = excluded.credential_hash, "
        "status = 'active', revoked_at = null, expires_at = excluded.expires_at;\n"
        "commit;\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Provision one CWS Worker credential")
    parser.add_argument("worker_id", nargs="?", help="omit to derive a stable ID from Windows MachineGuid")
    parser.add_argument("--store", type=Path, required=True, help="DPAPI credential file path")
    parser.add_argument("--sql-out", type=Path, required=True, help="hash-only SQL output path")
    parser.add_argument("--expires-days", type=int, default=90)
    parser.add_argument("--fleet-id", type=int, default=2)
    parser.add_argument("--gpu-name")
    parser.add_argument("--vram-mb", type=int, default=0)
    args = parser.parse_args()
    if not 1 <= args.expires_days <= 365:
        parser.error("--expires-days must be between 1 and 365")
    worker_id = args.worker_id or stable_worker_id(windows_machine_guid())
    if not _SAFE_WORKER_ID.fullmatch(worker_id):
        parser.error("worker_id contains unsupported characters or exceeds 128 characters")
    if args.fleet_id < 1:
        parser.error("--fleet-id must be positive")
    if args.vram_mb < 0:
        parser.error("--vram-mb must be non-negative")

    token = generate_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=args.expires_days)
    WindowsProtectedCredentialStore(args.store).save(token)
    args.sql_out.parent.mkdir(parents=True, exist_ok=True)
    args.sql_out.write_text(
        sql_for_identity(
            worker_id,
            token,
            expires_at,
            fleet_id=args.fleet_id,
            gpu_name=args.gpu_name,
            vram_mb=args.vram_mb,
        ),
        encoding="utf-8",
    )
    print(f"Provisioned DPAPI credential store: {args.store}")
    print(f"Stable Worker ID: {worker_id}")
    print(f"Wrote hash-only SQL: {args.sql_out}")
    print("Plaintext token is not included in the SQL or normal output.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
