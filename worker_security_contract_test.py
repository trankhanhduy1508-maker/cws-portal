"""Offline security contracts for the CWS Worker.

These tests parse source only. They never import the runtime, install a
package, call Supabase/B2, start Blender, or claim a production task.
"""

from pathlib import Path
import ast


SOURCE = Path(__file__).with_name("cws_worker_runtime.py")
TEXT = SOURCE.read_text(encoding="utf-8")
TREE = ast.parse(TEXT)


def _function(name):
    return next(
        node for node in TREE.body
        if isinstance(node, ast.FunctionDef) and node.name == name
    )


def test_untrusted_render_explicitly_disables_autoexec():
    source = ast.get_source_segment(TEXT, _function("render_single_frame"))
    assert source is not None
    assert '"--disable-autoexec"' in source
    assert '"--enable-autoexec" if enable_autoexec else "--disable-autoexec"' in source

    source = ast.get_source_segment(TEXT, _function("render_frame_range"))
    assert source is not None
    assert '"--disable-autoexec"' in source


def test_scene_analyzer_disables_embedded_scene_scripts():
    source = ast.get_source_segment(TEXT, _function("analyze_blend_scene"))
    assert source is not None
    assert '"--disable-autoexec"' in source


def test_generic_job_does_not_forward_python_optimization_expression():
    assert 'render_optimization_code = "" if is_generic_job else optimization_code' in TEXT
    assert 'optimization_code=render_optimization_code' in TEXT


def test_local_input_cache_has_filename_and_job_guards():
    assert "def _safe_blend_filename" in TEXT
    assert "candidate.name != raw_name" in TEXT
    assert 'candidate.suffix.lower() != ".blend"' in TEXT
    assert "def _safe_job_cache_key" in TEXT
    assert 'WORK_DIR / "inputs" / cache_key / safe_name' in TEXT


def test_no_shell_execution_in_worker_render_contract():
    # subprocess.run is allowed, shell=True is not.
    assert "shell=True" not in TEXT
