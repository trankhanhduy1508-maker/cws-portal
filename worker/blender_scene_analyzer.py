"""Read-only Blender scene analyzer for staging preflight.

Run with Blender `--background --disable-autoexec <scene.blend> --python
blender_scene_analyzer.py`; set CWS_ANALYZER_OUTPUT to a JSON path. The script
does not save or mutate the source .blend.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import bpy  # type: ignore


def image_bytes(image) -> int:
    width, height = image.size
    channels = max(int(getattr(image, "channels", 4) or 4), 1)
    return int(width) * int(height) * channels


def main() -> None:
    scene = bpy.context.scene
    blend_path = Path(bpy.data.filepath).resolve()
    textures = []
    missing = []
    texture_bytes = 0
    for image in bpy.data.images:
        path_value = image.filepath or ""
        resolved = Path(bpy.path.abspath(path_value)).resolve() if path_value else None
        item = {
            "name": image.name,
            "filepath": path_value,
            "packed": bool(image.packed_file),
            "width": int(image.size[0]),
            "height": int(image.size[1]),
            "estimated_bytes": image_bytes(image),
        }
        textures.append(item)
        texture_bytes += item["estimated_bytes"]
        if resolved and not image.packed_file and not resolved.exists():
            missing.append(str(resolved))

    mesh_polygons = sum(len(obj.data.polygons) for obj in bpy.data.objects if obj.type == "MESH")
    mesh_vertices = sum(len(obj.data.vertices) for obj in bpy.data.objects if obj.type == "MESH")
    subdivision = [
        {"object": obj.name, "levels": int(mod.levels), "render_levels": int(mod.render_levels)}
        for obj in bpy.data.objects
        for mod in obj.modifiers
        if mod.type == "SUBSURF"
    ]
    volume_nodes = [
        node.name
        for material in bpy.data.materials
        if material.use_nodes and material.node_tree
        for node in material.node_tree.nodes
        if node.type in {"PRINCIPLED_VOLUME", "VOLUME_SCATTER", "VOLUME_ABSORPTION"}
    ]
    cycles = scene.cycles if hasattr(scene, "cycles") else None
    result = {
        "schema_version": "cws.scene-analysis.v1",
        "blend_path": str(blend_path),
        "render_engine": scene.render.engine,
        "resolution": [scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage],
        "objects": len(bpy.data.objects),
        "meshes": sum(1 for obj in bpy.data.objects if obj.type == "MESH"),
        "mesh_vertices": mesh_vertices,
        "mesh_polygons": mesh_polygons,
        "lights": sum(1 for obj in bpy.data.objects if obj.type == "LIGHT"),
        "cameras": sum(1 for obj in bpy.data.objects if obj.type == "CAMERA"),
        "textures": textures,
        "texture_estimated_bytes": texture_bytes,
        "missing_assets": missing,
        "subdivision": subdivision,
        "volume_nodes": volume_nodes,
        "cycles": ({
            "samples": int(cycles.samples),
            "use_denoising": bool(cycles.use_denoising),
            "use_adaptive_sampling": bool(getattr(cycles, "use_adaptive_sampling", False)),
            "adaptive_threshold": float(getattr(cycles, "adaptive_threshold", 0.0)),
            "max_bounces": int(cycles.max_bounces),
            "diffuse_bounces": int(cycles.diffuse_bounces),
            "glossy_bounces": int(cycles.glossy_bounces),
            "transmission_bounces": int(cycles.transmission_bounces),
            "volume_bounces": int(cycles.volume_bounces),
            "transparent_bounces": int(cycles.transparent_max_bounces),
            "use_persistent_data": bool(getattr(cycles, "use_persistent_data", False)),
        } if cycles else None),
        "recommendations": [],
    }
    recs = result["recommendations"]
    if missing:
        recs.append({"tier": "SAFE", "action": "resolve_missing_assets", "reason": "render is not reproducible"})
    if texture_bytes > 2 * 1024**3:
        recs.append({"tier": "CONDITIONAL", "action": "review_texture_footprint", "reason": "estimated image memory exceeds 2 GiB"})
    if cycles and not result["cycles"]["use_adaptive_sampling"]:
        recs.append({"tier": "CONDITIONAL", "action": "benchmark_adaptive_sampling", "reason": "requires before/after image and time comparison"})
    if cycles and not result["cycles"]["use_persistent_data"]:
        recs.append({"tier": "CONDITIONAL", "action": "benchmark_persistent_data", "reason": "useful for animation but increases memory"})
    if volume_nodes:
        recs.append({"tier": "QUALITY-TRADEOFF", "action": "review_volume_bounces", "reason": "volume nodes detected; do not change automatically"})
    output = Path(os.environ.get("CWS_ANALYZER_OUTPUT", "scene-analysis.json")).resolve()
    output.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
    print(f"analysis_written={output}")


if __name__ == "__main__":
    main()
