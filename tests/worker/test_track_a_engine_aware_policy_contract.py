"""Static contract checks for the active legacy Track A Worker path.

Do not import cws_worker_full.py: importing it bootstraps packages and reads
production configuration. Runtime Blender checks remain a separate host gate.
"""
from __future__ import annotations

import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "cws_worker_full.py"


def _source() -> str:
    return SOURCE.read_text(encoding="utf-8")


def _function_source(name: str) -> str:
    tree = ast.parse(_source())
    node = next(item for item in tree.body if isinstance(item, ast.FunctionDef) and item.name == name)
    lines = _source().splitlines()
    return "\n".join(lines[node.lineno - 1:node.end_lineno])


def test_engine_detector_is_scene_data_driven() -> None:
    text = _source()
    assert "scene.render.engine" in text
    assert '"BLENDER_EEVEE": "EEVEE_LEGACY"' in text
    assert '"BLENDER_EEVEE_NEXT": "EEVEE_NEXT"' in text
    assert '"CYCLES": "CYCLES"' in text
    assert '"UNKNOWN"' in text


def test_active_path_uses_canonical_preflight_and_policy() -> None:
    text = _source()
    assert "analyze_blend_scene_v2(blend_path)" in text
    assert '"--disable-autoexec"' in _function_source("analyze_blend_scene_v2")
    assert "apply_engine_aware_optimization_policy(optimization_plan)" in text
    assert "apply_safe_optimizations_args(optimization_plan)" not in text


def test_effective_policy_is_diagnostics_only() -> None:
    text = _function_source("apply_engine_aware_optimization_policy")
    for mutation in (
        "scene.cycles.samples", "taa_render_samples", "shadow_cube_size",
        "sample_clamp_indirect", "use_simplify", "save_as_mainfile",
        "bpy.data.lights.new", "use_persistent_data",
    ):
        assert mutation not in text


def test_worker_launchers_remain_unchanged_by_this_slice() -> None:
    assert (ROOT / "cws_worker.bat").is_file()
    assert (ROOT / "cws_worker_full.py").is_file()
