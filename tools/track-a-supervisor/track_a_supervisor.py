#!/usr/bin/env python3
"""Track A local intake manifest.

This slice is intentionally local-only. It records and validates Founder
prepared jobs; it does not call Supabase, the CWS backend, B2, Blender, or the
Worker. Submission and runtime states belong to a later authenticated bridge.
"""

from __future__ import annotations

import argparse
import re
import sqlite3
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse


INPUT_TYPES = ("GOOGLE_DRIVE", "B2_REFERENCE")
DELIVERABLE_TYPES = ("FRAMES_ONLY", "FINAL_ANIMATION")
LOCAL_STATUSES = ("LOCAL_QUEUED", "INVALID", "READY_TO_SUBMIT")
SAFE_ID = re.compile(r"^[A-Z0-9][A-Z0-9._-]{1,63}$")
SECRET_MARKERS = (
    "authorization",
    "access_token",
    "api_key",
    "apikey",
    "app_key",
    "password",
    "secret",
    "service_role",
    "supabase_key",
    "token",
    "-----begin",
    "ghp_",
    "sk-",
)


SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    local_job_id TEXT PRIMARY KEY,
    customer_label TEXT NOT NULL,
    input_type TEXT NOT NULL,
    input_location TEXT NOT NULL,
    input_file_name TEXT NOT NULL,
    frame_start INTEGER,
    frame_end INTEGER,
    deliverable_type TEXT NOT NULL,
    output_prefix TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
)
"""


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def default_db_path() -> Path:
    local_app_data = Path(
        __import__("os").environ.get("LOCALAPPDATA")
        or (Path.home() / "AppData" / "Local")
    )
    return local_app_data / "CWS" / "track-a-supervisor" / "jobs.sqlite3"


def open_database(path: Path) -> sqlite3.Connection:
    path = path.expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(path))
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute(SCHEMA)
    connection.commit()
    return connection


def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


def contains_secret(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in SECRET_MARKERS)


def slug_customer(label: str) -> str:
    normalized = unicodedata.normalize("NFKD", label)
    ascii_label = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^A-Za-z0-9]+", "-", ascii_label).strip("-").upper()
    return (slug or "CUSTOMER")[:24]


def next_job_id(connection: sqlite3.Connection, customer_label: str) -> str:
    prefix = slug_customer(customer_label)
    rows = connection.execute(
        "SELECT local_job_id FROM jobs WHERE local_job_id LIKE ?",
        (prefix + "-%",),
    ).fetchall()
    used = set()
    for row in rows:
        match = re.fullmatch(re.escape(prefix) + r"-(\d{3,})", row["local_job_id"])
        if match:
            used.add(int(match.group(1)))
    number = 1
    while number in used:
        number += 1
    return f"{prefix}-{number:03d}"


def _valid_drive_location(location: str) -> bool:
    parsed = urlparse(location)
    host = (parsed.hostname or "").lower()
    if parsed.scheme.lower() != "https" or host not in {
        "drive.google.com",
        "www.googleapis.com",
    }:
        return False
    return bool(re.search(r"/d/[A-Za-z0-9_-]+", parsed.path) or parse_qs(parsed.query).get("id"))


def _valid_b2_location(location: str) -> bool:
    parsed = urlparse(location)
    return (
        parsed.scheme.lower() == "b2"
        and bool(parsed.netloc)
        and bool(parsed.path.strip("/"))
        and not parsed.query
        and not parsed.fragment
    )


def validate_job(job: dict) -> list[str]:
    errors = []
    job_id = str(job.get("local_job_id", "")).strip().upper()
    customer = str(job.get("customer_label", "")).strip()
    input_type = str(job.get("input_type", "")).strip().upper()
    location = str(job.get("input_location", "")).strip()
    file_name = str(job.get("input_file_name", "")).strip()
    deliverable = str(job.get("deliverable_type", "")).strip().upper()
    output_prefix = str(job.get("output_prefix", "")).strip().strip("/")

    if not SAFE_ID.fullmatch(job_id):
        errors.append("local_job_id must use 2-64 uppercase letters, digits, '.', '_' or '-'")
    if not customer:
        errors.append("customer_label is required")
    if input_type not in INPUT_TYPES:
        errors.append("input_type must be GOOGLE_DRIVE or B2_REFERENCE")
    if not location:
        errors.append("input_location is required")
    elif contains_secret(location):
        errors.append("input_location appears to contain a credential/token; it was not accepted")
    elif input_type == "GOOGLE_DRIVE" and not _valid_drive_location(location):
        errors.append("GOOGLE_DRIVE input_location must be a plausible HTTPS Google Drive file URL")
    elif input_type == "B2_REFERENCE" and not _valid_b2_location(location):
        errors.append("B2_REFERENCE input_location must be a b2://bucket/key reference")
    if not file_name or "/" in file_name or "\\" in file_name or "\x00" in file_name:
        errors.append("input_file_name must be a single file name")
    elif Path(file_name).suffix.lower() != ".blend":
        errors.append("input_file_name must use the current Track A .blend intake")
    if (job.get("frame_start") is None) != (job.get("frame_end") is None):
        errors.append("frame_start and frame_end must both be set or both be blank")
    if job.get("frame_start") is not None and job.get("frame_end") is not None:
        try:
            start, end = int(job["frame_start"]), int(job["frame_end"])
            if start < 0 or end < start:
                errors.append("frame_start must be <= frame_end and non-negative")
        except (TypeError, ValueError):
            errors.append("frame_start and frame_end must be integers")
    if deliverable not in DELIVERABLE_TYPES:
        errors.append("deliverable_type must be FRAMES_ONLY or FINAL_ANIMATION")
    expected_prefix = f"local/jobs/{job_id}"
    if output_prefix != expected_prefix and not output_prefix.startswith(expected_prefix + "/"):
        errors.append("output_prefix must remain inside the local job namespace")
    return errors


def normalize_job(job: dict) -> dict:
    job = dict(job)
    job["local_job_id"] = str(job.get("local_job_id", "")).strip().upper()
    job["customer_label"] = str(job.get("customer_label", "")).strip()
    job["input_type"] = str(job.get("input_type", "")).strip().upper()
    job["input_location"] = str(job.get("input_location", "")).strip()
    job["input_file_name"] = str(job.get("input_file_name", "")).strip()
    job["deliverable_type"] = str(job.get("deliverable_type", "")).strip().upper()
    if job.get("frame_start") not in (None, ""):
        job["frame_start"] = int(job["frame_start"])
    else:
        job["frame_start"] = None
    if job.get("frame_end") not in (None, ""):
        job["frame_end"] = int(job["frame_end"])
    else:
        job["frame_end"] = None
    job["output_prefix"] = f"local/jobs/{job['local_job_id']}"
    return job


def save_job(connection: sqlite3.Connection, job: dict) -> tuple[str, list[str]]:
    job = normalize_job(job)
    if contains_secret(job["input_location"]):
        raise ValueError("credential-like input is never stored in the manifest")
    errors = validate_job(job)
    status = "INVALID" if errors else "READY_TO_SUBMIT"
    now = utc_now()
    connection.execute(
        """INSERT INTO jobs (
            local_job_id, customer_label, input_type, input_location,
            input_file_name, frame_start, frame_end, deliverable_type,
            output_prefix, status, created_at, updated_at, retry_count, last_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)""",
        (
            job["local_job_id"],
            job["customer_label"],
            job["input_type"],
            job["input_location"],
            job["input_file_name"],
            job["frame_start"],
            job["frame_end"],
            job["deliverable_type"],
            job["output_prefix"],
            status,
            now,
            now,
            "; ".join(errors) if errors else None,
        ),
    )
    connection.commit()
    return status, errors


def get_job(connection: sqlite3.Connection, job_id: str) -> dict | None:
    row = connection.execute(
        "SELECT * FROM jobs WHERE local_job_id = ?", (job_id.strip().upper(),)
    ).fetchone()
    return row_to_dict(row) if row else None


def update_job(connection: sqlite3.Connection, job_id: str, changes: dict) -> tuple[str, list[str]]:
    current = get_job(connection, job_id)
    if not current:
        raise ValueError("job not found")
    merged = {**current, **changes, "local_job_id": current["local_job_id"]}
    merged = normalize_job(merged)
    if contains_secret(merged["input_location"]):
        raise ValueError("credential-like input is never stored in the manifest")
    errors = validate_job(merged)
    status = "INVALID" if errors else "READY_TO_SUBMIT"
    connection.execute(
        """UPDATE jobs SET customer_label=?, input_type=?, input_location=?,
        input_file_name=?, frame_start=?, frame_end=?, deliverable_type=?,
        output_prefix=?, status=?, updated_at=?, last_error=?
        WHERE local_job_id=?""",
        (
            merged["customer_label"],
            merged["input_type"],
            merged["input_location"],
            merged["input_file_name"],
            merged["frame_start"],
            merged["frame_end"],
            merged["deliverable_type"],
            merged["output_prefix"],
            status,
            utc_now(),
            "; ".join(errors) if errors else None,
            current["local_job_id"],
        ),
    )
    connection.commit()
    return status, errors


def delete_job(connection: sqlite3.Connection, job_id: str) -> None:
    job = get_job(connection, job_id)
    if not job:
        raise ValueError("job not found")
    if job["status"] not in ("LOCAL_QUEUED", "INVALID"):
        raise ValueError("only LOCAL_QUEUED or INVALID jobs may be deleted in this slice")
    connection.execute("DELETE FROM jobs WHERE local_job_id = ?", (job["local_job_id"],))
    connection.commit()


def prompt_nonempty(label: str, default: str | None = None) -> str:
    suffix = f" [{default}]" if default else ""
    while True:
        value = input(f"{label}{suffix}: ").strip()
        if not value and default is not None:
            return default
        if value:
            return value
        print("Required.")


def prompt_choice(label: str, choices: tuple[str, ...], default: str | None = None) -> str:
    choices_text = "/".join(choices)
    while True:
        value = input(f"{label} ({choices_text})" + (f" [{default}]" if default else "") + ": ").strip().upper()
        if not value and default:
            return default
        if value in choices:
            return value
        print(f"Choose one of: {choices_text}")


def prompt_frames() -> tuple[int | None, int | None]:
    while True:
        start_text = input("Frame start (blank if unknown): ").strip()
        end_text = input("Frame end (blank if unknown): ").strip()
        if not start_text and not end_text:
            return None, None
        try:
            start, end = int(start_text), int(end_text)
            return start, end
        except ValueError:
            print("Both frame values must be integers, or both blank.")


def interactive_add(connection: sqlite3.Connection) -> None:
    while True:
        customer = prompt_nonempty("Customer label")
        job_id = next_job_id(connection, customer)
        input_type = prompt_choice("Input type", INPUT_TYPES)
        while True:
            location = prompt_nonempty("Input location")
            if contains_secret(location):
                print("Rejected: credential-like input is never stored in the manifest.")
                continue
            break
        file_name = prompt_nonempty(".blend file name")
        frame_start, frame_end = prompt_frames()
        deliverable = prompt_choice("Deliverable", DELIVERABLE_TYPES, "FRAMES_ONLY")
        job = {
            "local_job_id": job_id,
            "customer_label": customer,
            "input_type": input_type,
            "input_location": location,
            "input_file_name": file_name,
            "frame_start": frame_start,
            "frame_end": frame_end,
            "deliverable_type": deliverable,
        }
        normalized = normalize_job(job)
        print(f"\nID: {normalized['local_job_id']}")
        print(f"Output namespace: {normalized['output_prefix']}")
        print(f"Status preview: {'READY_TO_SUBMIT' if not validate_job(normalized) else 'INVALID'}")
        if input("Save this job? (Y/N): ").strip().upper() != "Y":
            print("Not saved.")
        else:
            try:
                status, errors = save_job(connection, normalized)
                print(f"Saved {job_id} [{status}].")
                for error in errors:
                    print(f"  - {error}")
            except sqlite3.IntegrityError:
                print(f"Not saved: local_job_id {job_id} already exists.")
        if input("Add another job? (Y/N): ").strip().upper() != "Y":
            return


def print_jobs(rows: list[dict]) -> None:
    if not rows:
        print("No local jobs.")
        return
    headers = ("ID", "CUSTOMER", "FILE", "TYPE", "STATUS")
    print("{:<24} {:<18} {:<28} {:<16} {}".format(*headers))
    print("-" * 100)
    for job in rows:
        print("{:<24} {:<18} {:<28} {:<16} {}".format(
            job["local_job_id"][:24],
            job["customer_label"][:18],
            job["input_file_name"][:28],
            job["deliverable_type"],
            job["status"],
        ))


def list_jobs(connection: sqlite3.Connection) -> None:
    rows = connection.execute("SELECT * FROM jobs ORDER BY created_at, local_job_id").fetchall()
    print_jobs([row_to_dict(row) for row in rows])


def show_job(connection: sqlite3.Connection, job_id: str) -> None:
    job = get_job(connection, job_id)
    if not job:
        raise ValueError("job not found")
    for key, value in job.items():
        print(f"{key}: {value if value is not None else ''}")


def interactive_edit(connection: sqlite3.Connection, job_id: str) -> None:
    current = get_job(connection, job_id)
    if not current:
        raise ValueError("job not found")
    print("Press Enter to keep the current value.")
    changes = {
        "customer_label": input(f"Customer label [{current['customer_label']}]: ").strip() or current["customer_label"],
        "input_type": prompt_choice("Input type", INPUT_TYPES, current["input_type"]),
        "input_location": input(f"Input location [{current['input_location']}]: ").strip() or current["input_location"],
        "input_file_name": input(f".blend file name [{current['input_file_name']}]: ").strip() or current["input_file_name"],
        "frame_start": input(f"Frame start [{current['frame_start'] if current['frame_start'] is not None else ''}]: ").strip() or current["frame_start"],
        "frame_end": input(f"Frame end [{current['frame_end'] if current['frame_end'] is not None else ''}]: ").strip() or current["frame_end"],
        "deliverable_type": prompt_choice("Deliverable", DELIVERABLE_TYPES, current["deliverable_type"]),
    }
    if contains_secret(changes["input_location"]):
        raise ValueError("credential-like input is never stored in the manifest")
    status, errors = update_job(connection, job_id, changes)
    print(f"Updated {job_id} [{status}].")
    for error in errors:
        print(f"  - {error}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Track A local-only job manifest")
    parser.add_argument("--db", type=Path, default=None, help=argparse.SUPPRESS)
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("add", help="prompt for one or more jobs")
    subparsers.add_parser("list", help="list local jobs")
    show = subparsers.add_parser("show", help="show one local job")
    show.add_argument("job_id")
    edit = subparsers.add_parser("edit", help="edit one local job")
    edit.add_argument("job_id")
    delete = subparsers.add_parser("delete", help="delete only LOCAL_QUEUED/INVALID")
    delete.add_argument("job_id")
    return parser.parse_args(argv)


def interactive_menu(connection: sqlite3.Connection) -> None:
    while True:
        print("\nCWS Track A Supervisor V1 — local manifest only")
        print("1) Add job(s)  2) List jobs  3) Show job  4) Edit job  5) Delete local job  0) Exit")
        choice = input("Choose: ").strip()
        try:
            if choice == "1":
                interactive_add(connection)
            elif choice == "2":
                list_jobs(connection)
            elif choice == "3":
                show_job(connection, prompt_nonempty("Job ID"))
            elif choice == "4":
                interactive_edit(connection, prompt_nonempty("Job ID"))
            elif choice == "5":
                job_id = prompt_nonempty("Job ID")
                if input(f"Type DELETE {job_id.upper()} to confirm: ").strip() == f"DELETE {job_id.upper()}":
                    delete_job(connection, job_id)
                    print("Deleted local record.")
            elif choice == "0":
                return
            else:
                print("Choose 0-5.")
        except (ValueError, sqlite3.Error) as error:
            print(f"Not completed: {error}")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    db_path = args.db or Path(__import__("os").environ.get("CWS_SUPERVISOR_DB", default_db_path()))
    connection = open_database(db_path)
    try:
        if not args.command:
            interactive_menu(connection)
        elif args.command == "add":
            interactive_add(connection)
        elif args.command == "list":
            list_jobs(connection)
        elif args.command == "show":
            show_job(connection, args.job_id)
        elif args.command == "edit":
            interactive_edit(connection, args.job_id)
        elif args.command == "delete":
            delete_job(connection, args.job_id)
        return 0
    except (ValueError, sqlite3.Error) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
