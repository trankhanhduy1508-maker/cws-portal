"""Offline contract tests for the replaceable CWS Worker package."""
from pathlib import Path
import ast

ROOT = Path(__file__).resolve().parent
ENTRYPOINT = ROOT / "cws_worker.py"
RUNTIME = ROOT / "cws_worker_runtime.py"

def test_entrypoint_is_valid_python():
    ast.parse(ENTRYPOINT.read_text(encoding="utf-8"))

def test_runtime_is_present_and_nontrivial():
    assert RUNTIME.is_file()
    assert RUNTIME.stat().st_size > 10_000

def test_entrypoint_does_not_contain_credentials():
    source = ENTRYPOINT.read_text(encoding="utf-8")
    assert "applicationKey" not in source
    assert "K004" not in source
