"""Static contract test for the Worker frame timeout safety guard.

This test parses source only; it never imports the Worker or starts
Blender/network/package installation.
"""
from pathlib import Path
import ast

SOURCE = Path(__file__).with_name("cws_worker_runtime.py")


def test_frame_timeout_contract():
    tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
    source = SOURCE.read_text(encoding="utf-8")
    assert "FRAME_TIMEOUT_SEC" in source
    assert "subprocess.TimeoutExpired" in source
    subprocess_calls = [
        node for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "run"
    ]
    assert any(
        any(keyword.arg == "timeout" for keyword in call.keywords)
        for call in subprocess_calls
    )


def test_local_output_cleanup_contract():
    source = SOURCE.read_text(encoding="utf-8")
    tree = ast.parse(source)
    assert "def reset_task_output_dir" in source
    assert "shutil.rmtree(output_dir, ignore_errors=True)" in source
    assert any(
        isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "reset_task_output_dir"
        for node in ast.walk(tree)
    )
