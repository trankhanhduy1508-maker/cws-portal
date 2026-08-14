"""Read-only Blender scene analyzer for Track A Archviz preflight.

Invoke Blender with ``--background --disable-autoexec <scene.blend> --python
blender_scene_analyzer.py`` and set ``CWS_ANALYZER_OUTPUT``.  This script does
not render, save, mutate the source scene, execute scene Python, or call CWS
services.  The legacy top-level fields are retained for the Worker contract;
the structured envelope is ``cws.archviz-preflight.v1``.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import bpy  # type: ignore

UNKNOWN = "UNKNOWN"


def _resolved(value: str) -> Path | None:
    if not value:
        return None
    try:
        return Path(bpy.path.abspath(value)).resolve()
    except (OSError, RuntimeError, ValueError):
        return None


def _node_types(material: Any) -> set[str]:
    if not getattr(material, "use_nodes", False) or not material.node_tree:
        return set()
    return {node.type for node in material.node_tree.nodes}


def _socket_value(node: Any, name: str) -> float | None:
    socket = node.inputs.get(name)
    if socket is None:
        return None
    try:
        value = socket.default_value
        return float(value) if isinstance(value, (int, float)) else None
    except (TypeError, ValueError):
        return None


def _image_record(image: Any) -> dict[str, Any]:
    width, height = int(image.size[0]), int(image.size[1])
    channels = max(int(getattr(image, "channels", 4) or 4), 1)
    filepath = image.filepath or ""
    resolved = _resolved(filepath)
    file_bytes = None
    if resolved and not image.packed_file:
        try:
            file_bytes = resolved.stat().st_size if resolved.is_file() else None
        except OSError:
            pass
    return {
        "name": image.name,
        "filepath": filepath,
        "packed": bool(image.packed_file),
        "width": width,
        "height": height,
        "estimated_bytes": width * height * channels,
        "file_bytes": file_bytes,
    }


def _libraries() -> tuple[list[str], list[str]]:
    linked, missing = [], []
    for library in bpy.data.libraries:
        filepath = library.filepath or ""
        resolved = _resolved(filepath)
        value = str(resolved or filepath)
        linked.append(value)
        if resolved and not resolved.exists():
            missing.append(value)
    return linked, missing


def _cache_references() -> list[str]:
    result: set[str] = set()
    for obj in bpy.data.objects:
        for modifier in obj.modifiers:
            for owner in (modifier, getattr(modifier, "point_cache", None)):
                value = getattr(owner, "filepath", "") if owner else ""
                if isinstance(value, str) and value.lower().endswith((".vdb", ".abc", ".cache")):
                    result.add(value)
    for image in bpy.data.images:
        if (image.filepath or "").lower().endswith((".vdb", ".abc", ".cache")):
            result.add(image.filepath)
    return sorted(result)


def _profile(scene: Any, materials: list[Any], volume_count: int) -> tuple[str, str]:
    names = " ".join(str(obj.name).lower() for obj in bpy.data.objects)
    types = set().union(*(_node_types(material) for material in materials)) if materials else set()
    lights = sum(1 for obj in bpy.data.objects if obj.type == "LIGHT")
    cameras = sum(1 for obj in bpy.data.objects if obj.type == "CAMERA")
    if volume_count:
        return "VOLUME_VFX", "medium"
    if any(word in names for word in ("gis", "terrain", "osm", "geodata")):
        return "ARCHVIZ_GIS", "low"
    if any(word in names for word in ("building", "facade", "exterior", "street")):
        return "ARCHVIZ_EXTERIOR", "low"
    if cameras and ("BSDF_GLASS" in types or lights >= 3):
        return "ARCHVIZ_INTERIOR", "low"
    if scene.frame_end > scene.frame_start:
        return "BLENDER_ANIMATION", "low"
    return "BLENDER_GENERAL", "low"


def _risk_flags(result: dict[str, Any]) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []
    assets, geometry, render = result["assets"], result["geometry"], result["render"]
    lighting = result["materials_lighting"]
    if assets["missing_images"] or assets["missing_linked_libraries"]:
        flags.append({"code": "MISSING_ASSET", "severity": "HIGH", "reason": "external scene dependency is missing"})
    if assets["external_cache_references"]:
        flags.append({"code": "EXTERNAL_CACHE", "severity": "MEDIUM", "reason": "cache/VDB reference requires dependency verification"})
    if assets["estimated_texture_bytes"] >= 2 * 1024**3:
        flags.append({"code": "TEXTURE_MEMORY", "severity": "HIGH", "reason": "estimated decoded texture footprint is at least 2 GiB"})
    if geometry["triangles"] >= 20_000_000:
        flags.append({"code": "GEOMETRY_COMPLEXITY", "severity": "HIGH", "reason": "approximate triangle count is at least 20 million"})
    if geometry["subdivision_modifiers"] or geometry["displacement_indicators"]:
        flags.append({"code": "SUBDIVISION_DISPLACEMENT", "severity": "MEDIUM", "reason": "render-time geometry amplification is present"})
    if geometry["geometry_nodes"]:
        flags.append({"code": "GEOMETRY_NODES", "severity": "MEDIUM", "reason": "evaluated geometry may exceed base mesh counts"})
    if lighting["volume_materials"]:
        flags.append({"code": "VOLUME", "severity": "MEDIUM", "reason": "volume materials can increase memory and path cost"})
    if lighting["glass_transmission_materials"]:
        flags.append({"code": "TRANSMISSION", "severity": "MEDIUM", "reason": "glass/transmission paths can increase noise and bounce cost"})
    if render["engine"] == "CYCLES" and render["adaptive_sampling"] is False:
        flags.append({"code": "ADAPTIVE_SAMPLING_OFF", "severity": "INFO", "reason": "adaptive sampling is disabled; benchmark before changing"})
    return flags


def main() -> None:
    scene = bpy.context.scene
    blend_path = Path(bpy.data.filepath).resolve()
    materials = list(bpy.data.materials)
    cycles = getattr(scene, "cycles", None)
    images = [_image_record(image) for image in bpy.data.images]
    missing_images = [item["filepath"] for item in images if item["filepath"] and not item["packed"] and _resolved(item["filepath"]) and not _resolved(item["filepath"]).exists()]
    linked_libraries, missing_libraries = _libraries()
    mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH" and getattr(obj, "data", None)]
    vertices = sum(len(obj.data.vertices) for obj in mesh_objects)
    polygons = sum(len(obj.data.polygons) for obj in mesh_objects)
    triangles = sum(len(obj.data.loop_triangles) for obj in mesh_objects)
    subdivision = [{"object": obj.name, "levels": int(mod.levels), "render_levels": int(mod.render_levels)} for obj in bpy.data.objects for mod in obj.modifiers if mod.type == "SUBSURF"]
    displacement = [{"object": obj.name, "type": mod.type} for obj in bpy.data.objects for mod in obj.modifiers if mod.type in {"DISPLACE", "MULTIRES"}]
    geometry_nodes = [obj.name for obj in bpy.data.objects if any(mod.type == "NODES" for mod in obj.modifiers)]
    instances = [obj.name for obj in bpy.data.objects if getattr(obj, "instance_type", "NONE") != "NONE" or getattr(obj, "instance_collection", None)]
    volume_types = {"PRINCIPLED_VOLUME", "VOLUME_SCATTER", "VOLUME_ABSORPTION"}
    volume_nodes = [node.name for material in materials for node in getattr(material.node_tree, "nodes", []) if node.type in volume_types]
    glass, transparent, volumes = [], [], []
    for material in materials:
        types = _node_types(material)
        nodes = list(getattr(material.node_tree, "nodes", [])) if material.node_tree else []
        transmission = any((_socket_value(node, "Transmission Weight") or _socket_value(node, "Transmission") or 0) > 0 for node in nodes if node.type == "BSDF_PRINCIPLED")
        if transmission or "BSDF_GLASS" in types:
            glass.append(material.name)
        if "BSDF_TRANSPARENT" in types or any((_socket_value(node, "Alpha") or 1) < 1 for node in nodes if node.type == "BSDF_PRINCIPLED"):
            transparent.append(material.name)
        if types.intersection(volume_types):
            volumes.append(material.name)
    profile, confidence = _profile(scene, materials, len(volume_nodes))
    light_path_keys = ("max_bounces", "diffuse_bounces", "glossy_bounces", "transmission_bounces", "volume_bounces", "transparent_max_bounces")
    light_paths = {key: int(getattr(cycles, key, 0)) if cycles else None for key in light_path_keys}
    render = {
        "engine": scene.render.engine,
        "resolution": [int(scene.render.resolution_x), int(scene.render.resolution_y), int(scene.render.resolution_percentage)],
        "fps": float(scene.render.fps) / max(float(scene.render.fps_base), 1e-9),
        "frame_start": int(scene.frame_start), "frame_end": int(scene.frame_end), "total_frames": int(scene.frame_end - scene.frame_start + 1),
        "samples": int(cycles.samples) if cycles else None,
        "min_samples": int(getattr(cycles, "adaptive_min_samples", 0)) if cycles else None,
        "adaptive_sampling": bool(getattr(cycles, "use_adaptive_sampling", False)) if cycles else None,
        "noise_threshold": float(getattr(cycles, "adaptive_threshold", 0.0)) if cycles else None,
        "denoising": {"enabled": bool(getattr(cycles, "use_denoising", False)), "type": getattr(cycles, "denoiser", UNKNOWN)} if cycles else None,
        "persistent_data": bool(getattr(scene.render, "use_persistent_data", False)),
        "device": getattr(cycles, "device", UNKNOWN) if cycles else UNKNOWN, "backend": UNKNOWN,
        "light_paths": light_paths,
        "clamp_direct": float(getattr(cycles, "sample_clamp_direct", 0.0)) if cycles else None,
        "clamp_indirect": float(getattr(cycles, "sample_clamp_indirect", 0.0)) if cycles else None,
        "caustics": {"reflective": getattr(cycles, "caustics_reflective", None), "refractive": getattr(cycles, "caustics_refractive", None)} if cycles else None,
    }
    geometry = {"objects": len(bpy.data.objects), "meshes": len(mesh_objects), "vertices": vertices, "polygons": polygons, "triangles": triangles, "instances": instances, "linked_collections": [c.name for c in bpy.data.collections if c.library], "geometry_nodes": geometry_nodes, "subdivision_modifiers": subdivision, "displacement_indicators": displacement}
    assets = {"packed_images": sum(1 for item in images if item["packed"]), "external_images": sum(1 for item in images if item["filepath"] and not item["packed"]), "images": images, "texture_count": len(images), "estimated_texture_bytes": sum(item["estimated_bytes"] for item in images), "largest_texture": max(images, key=lambda item: item["estimated_bytes"], default=None), "missing_images": missing_images, "linked_libraries": linked_libraries, "missing_linked_libraries": missing_libraries, "external_cache_references": _cache_references()}
    result: dict[str, Any] = {
        "schema_version": "cws.archviz-preflight.v1",
        "project": {"blend_path": str(blend_path), "blender_version": bpy.app.version_string, "profile": profile, "profile_confidence": confidence},
        "render": render,
        "geometry": geometry,
        "materials_lighting": {"materials": len(materials), "glass_transmission_materials": glass, "transparent_alpha_materials": transparent, "volume_materials": volumes, "volume_nodes": volume_nodes, "lights": sum(1 for obj in bpy.data.objects if obj.type == "LIGHT"), "world_present": bool(scene.world), "world_uses_nodes": bool(scene.world and scene.world.use_nodes), "indirect_lighting_indicators": UNKNOWN},
        "assets": assets,
        "dependencies": {"enabled_addons": sorted(bpy.context.preferences.addons.keys()), "missing_addons": UNKNOWN, "missing_dependencies": UNKNOWN},
        "memory_risk": {"texture_heavy": UNKNOWN, "geometry_heavy": UNKNOWN, "displacement_or_subdivision": bool(subdivision or displacement), "volume_heavy": bool(volume_nodes), "likely_vram_risk": UNKNOWN},
        "risk_flags": [], "recommendations": [],
        # Compatibility fields consumed by ProductionNodeAgent and WorkerEngine.
        "frame_start": render["frame_start"], "frame_end": render["frame_end"], "total_frames": render["total_frames"], "fps": render["fps"], "blend_path": str(blend_path), "render_engine": render["engine"], "resolution": render["resolution"], "objects": geometry["objects"], "meshes": geometry["meshes"], "mesh_vertices": vertices, "mesh_polygons": polygons, "lights": sum(1 for obj in bpy.data.objects if obj.type == "LIGHT"), "cameras": sum(1 for obj in bpy.data.objects if obj.type == "CAMERA"), "textures": images, "texture_estimated_bytes": assets["estimated_texture_bytes"], "missing_assets": missing_images + missing_libraries, "subdivision": subdivision, "volume_nodes": volume_nodes,
        "cycles": {"samples": render["samples"], "use_denoising": render["denoising"]["enabled"], "use_adaptive_sampling": render["adaptive_sampling"], "adaptive_threshold": render["noise_threshold"], **light_paths, "transparent_bounces": light_paths["transparent_max_bounces"], "use_persistent_data": render["persistent_data"]} if cycles else None,
    }
    result["risk_flags"] = _risk_flags(result)
    output = Path(os.environ.get("CWS_ANALYZER_OUTPUT", "scene-analysis.json")).resolve()
    output.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
    print(f"analysis_written={output}")


if __name__ == "__main__":
    main()
