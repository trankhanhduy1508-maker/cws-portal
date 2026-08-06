"""Offline provisioning helper for one CWS Worker identity.

Default behavior writes the token into a Windows DPAPI store and writes only
the SHA-256 hash as SQL. It never prints the plaintext token. Run this on the
Worker host under the dedicated least-privilege service account; apply the SQL
through the approved backend/database process, never by pasting a token into
chat, Git, or logs.
"""

from __future__ import annotations

import argparse
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from windows_credential_store import WindowsProtectedCredentialStore


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def credential_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def sql_for_identity(worker_id: str, token: str, expires_at: datetime) -> str:
    safe_worker_id = worker_id.replace("'", "''")
    return (
        "insert into public.worker_identities "
        "(worker_id, credential_hash, status, expires_at) values ("
        f"'{safe_worker_id}', '{credential_hash(token)}', 'active', "
        f"'{expires_at.astimezone(timezone.utc).isoformat()}') "
        "on conflict (worker_id) do update set credential_hash = excluded.credential_hash, "
        "status = 'active', revoked_at = null, expires_at = excluded.expires_at;\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Provision one CWS Worker credential")
    parser.add_argument("worker_id")
    parser.add_argument("--store", type=Path, required=True, help="DPAPI credential file path")
    parser.add_argument("--sql-out", type=Path, required=True, help="hash-only SQL output path")
    parser.add_argument("--expires-days", type=int, default=90)
    parser.add_argument("--print-token", action="store_true", help="explicitly print token once to a secure terminal")
    args = parser.parse_args()
    if not 1 <= args.expires_days <= 365:
        parser.error("--expires-days must be between 1 and 365")
    if not args.worker_id or len(args.worker_id) > 128:
        parser.error("worker_id is required and must be at most 128 characters")

    token = generate_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=args.expires_days)
    WindowsProtectedCredentialStore(args.store).save(token)
    args.sql_out.parent.mkdir(parents=True, exist_ok=True)
    args.sql_out.write_text(sql_for_identity(args.worker_id, token, expires_at), encoding="utf-8")
    if args.print_token:
        print(token)
    print(f"Provisioned DPAPI credential store: {args.store}")
    print(f"Wrote hash-only SQL: {args.sql_out}")
    print("Plaintext token is not included in the SQL or normal output.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
