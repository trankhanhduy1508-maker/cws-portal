"""Static contract test for the Worker frame timeout safety guard.

This test parses the source only; it never imports the Worker or starts
Blender/network/package installation.
"""
from pathlib import Path
import ast


SOURCE = Path(__file__).with_name("cws_worker_full.py")


def test_frame_timeout_contract():
    tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
    source = SOURCE.read_text(encoding="utf-8")
    assert "FRAME_TIMEOUT_SEC" in source
    assert "subprocess.TimeoutExpired" in source

    subprocess_calls = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "run"
    ]
    assert any(
        any(keyword.arg == "timeout" for keyword in call.keywords)
        for call in subprocess_calls
    )
