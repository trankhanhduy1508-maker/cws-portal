"""Static safety/contract checks for ARCHVIZ_PREFLIGHT_V1.

These checks deliberately do not import bpy or execute a customer .blend.
Blender runtime verification belongs to a host with an explicit Blender
executable and a harmless staging fixture.
"""
from __future__ import annotations

import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "worker" / "blender_scene_analyzer.py"


def test_archviz_schema_and_required_sections_are_present() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    tree = ast.parse(source)
    assert tree
    for marker in (
        'cws.archviz-preflight.v1',
        '"project"', '"render"', '"geometry"', '"materials_lighting"',
        '"assets"', '"dependencies"', '"memory_risk"', '"risk_flags"',
        'use_adaptive_sampling', 'adaptive_threshold', 'sample_clamp_indirect',
        'caustics_reflective', 'geometry_nodes', 'external_cache_references',
        'missing_linked_libraries', 'enabled_addons',
    ):
        assert marker in source


def test_preflight_is_read_only_and_service_free() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    forbidden = (
        "bpy.ops.render", "save_as_mainfile", "requests", "boto3",
        "urllib.request", "Invoke-RestMethod", "supabase", "backblaze",
    )
    lowered = source.lower()
    assert not any(marker.lower() in lowered for marker in forbidden)
    assert "--disable-autoexec" in (ROOT / "worker" / "worker_engine.py").read_text(encoding="utf-8")


def test_worker_compatibility_fields_remain() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    for marker in ("frame_start", "frame_end", "total_frames", "fps", "missing_assets", "cycles"):
        assert marker in source
