"""Create a bounded, intentionally unoptimized Eevee architecture stress scene.

Run from Blender background mode:
  blender -b --python create_unoptimized_eevee_stress_scene.py -- \
    --output tests/assets/cws_blender_unoptimized_eevee_stress.blend \
    --profile heavy-single

The scene is deliberately inefficient but bounded: it uses Eevee, generated
textures, dense meshes, unapplied modifiers, many lights, volumetrics and
animation. It does not download assets, enable autoexec or create unbounded
geometry/files.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


MAX_OBJECTS = 240
MAX_LIGHTS = 32
MAX_FRAMES = 48


def arguments() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--profile", choices=("heavy-single", "heavy-animation"), default="heavy-single")
    return parser.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def set_eevee(scene: bpy.types.Scene) -> str:
    for candidate in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = candidate
            return candidate
        except (TypeError, ValueError):
            continue
    raise RuntimeError("This Blender build has no Eevee engine")


def configure_render(scene: bpy.types.Scene, profile: str) -> None:
    engine = set_eevee(scene)
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.use_file_extension = True
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = "//cws_eevee_stress/frame_####"
    scene.frame_start = 1
    scene.frame_end = 1 if profile == "heavy-single" else MAX_FRAMES
    scene.render.fps = 24
    scene.render.engine = engine
    eevee = getattr(scene, "eevee", None)
    if eevee:
        for prop in ("taa_render_samples", "taa_samples"):
            if hasattr(eevee, prop):
                setattr(eevee, prop, 128)
        if hasattr(eevee, "use_gtao"):
            eevee.use_gtao = True
            eevee.gtao_distance = 3.0
            eevee.gtao_factor = 2.0
        for prop, value in (("shadow_cube_size", "2048"), ("shadow_cascade_size", "2048")):
            if hasattr(eevee, prop):
                try:
                    setattr(eevee, prop, value)
                except (TypeError, ValueError):
                    pass
    if hasattr(scene.render, "use_motion_blur"):
        scene.render.use_motion_blur = True

    world = scene.world or bpy.data.worlds.new("CWS_Stress_World")
    scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputWorld")
    background = nodes.new("ShaderNodeBackground")
    background.inputs["Color"].default_value = (0.025, 0.04, 0.07, 1)
    background.inputs["Strength"].default_value = 0.2
    volume = nodes.new("ShaderNodeVolumePrincipled")
    volume.inputs["Density"].default_value = 0.012
    volume.inputs["Anisotropy"].default_value = 0.35
    links.new(background.outputs["Background"], output.inputs["Surface"])
    links.new(volume.outputs["Volume"], output.inputs["Volume"])


def generated_image(name: str, color: tuple[float, float, float, float]):
    image = bpy.data.images.new(name, width=1024, height=1024, alpha=True)
    image.generated_color = color
    return image


def complex_material(name: str, base: tuple[float, float, float, float], metallic: float, roughness: float,
                     image=None, glass=False):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Base Color"].default_value = base
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if glass:
        shader.inputs["Transmission Weight"].default_value = 0.72
        shader.inputs["IOR"].default_value = 1.45
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6.0
    noise.inputs["Detail"].default_value = 10.0
    noise.inputs["Roughness"].default_value = 0.8
    voronoi = nodes.new("ShaderNodeTexVoronoi")
    voronoi.inputs["Scale"].default_value = 18.0
    wave = nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = 12.0
    ramp = nodes.new("ShaderNodeValToRGB")
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.28
    bump.inputs["Distance"].default_value = 0.18
    mapping = nodes.new("ShaderNodeMapping")
    texcoord = nodes.new("ShaderNodeTexCoord")
    links.new(texcoord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(mapping.outputs["Vector"], voronoi.inputs["Vector"])
    links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    if image:
        image_node = nodes.new("ShaderNodeTexImage")
        image_node.image = image
        mix = nodes.new("ShaderNodeMixRGB")
        mix.inputs["Fac"].default_value = 0.22
        links.new(image_node.outputs["Color"], mix.inputs["Color1"])
        links.new(ramp.outputs["Color"], mix.inputs["Color2"])
        links.new(mix.outputs["Color"], shader.inputs["Base Color"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def add_cube(name: str, location, scale, material, bevel=0.08, subdivision=0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("Unoptimized bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 4
    if subdivision:
        mod = obj.modifiers.new("Unoptimized subdivision", "SUBSURF")
        mod.levels = subdivision
        mod.render_levels = subdivision
    return obj


def add_uv_object(name: str, location, scale, material, segments=32, rings=20, subdivision=1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    if material:
        obj.data.materials.append(material)
    if subdivision:
        mod = obj.modifiers.new("Unoptimized subdivision", "SUBSURF")
        mod.levels = subdivision
        mod.render_levels = subdivision
    return obj


def add_light(name: str, kind: str, location, energy: float, color):
    data = bpy.data.lights.new(name, type=kind)
    data.energy = energy
    data.color = color
    data.use_shadow = True
    if kind in {"AREA", "SPOT"}:
        data.shadow_soft_size = 0.25
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    return obj


def point_camera(camera, target: Vector):
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def build_scene(scene: bpy.types.Scene, profile: str) -> None:
    images = [generated_image("CWS_Heavy_Texture_%d" % i, color) for i, color in enumerate(
        ((0.18, 0.08, 0.03, 1), (0.04, 0.12, 0.2, 1), (0.25, 0.25, 0.25, 1)))]
    floor = complex_material("Floor_Complex", (0.16, 0.12, 0.08, 1), 0.05, 0.3, images[0])
    wall = complex_material("Wall_Complex", (0.42, 0.44, 0.46, 1), 0.0, 0.58, images[1])
    wood = complex_material("Wood_Complex", (0.22, 0.055, 0.018, 1), 0.0, 0.28, images[0])
    metal = complex_material("Metal_Complex", (0.12, 0.16, 0.2, 1), 0.88, 0.18, images[2])
    glass = complex_material("Glass_Complex", (0.08, 0.2, 0.28, 1), 0.1, 0.08, images[1], glass=True)
    fabric = complex_material("Fabric_Complex", (0.08, 0.14, 0.22, 1), 0.0, 0.86, images[2])

    add_cube("Floor_Dense", (0, 0, -0.2), (8, 6, 0.2), floor, bevel=0.15, subdivision=1)
    add_cube("Wall_Back", (0, 6, 3), (8, 0.2, 3), wall, bevel=0.1, subdivision=1)
    add_cube("Wall_Left", (-8, 0, 3), (0.2, 6, 3), wall, bevel=0.1, subdivision=1)
    add_cube("Ceiling", (0, 0, 6.2), (8, 6, 0.15), wall, bevel=0.06, subdivision=1)
    for x in (-5.0, -1.7, 1.7, 5.0):
        add_cube("Glass_Window", (x, 5.7, 3.4), (1.25, 0.08, 1.8), glass, bevel=0.12, subdivision=1)

    # Furniture with unapplied bevel/subdivision stacks.
    for i, x in enumerate((-5.6, -3.7, -1.8, 0.1, 2.0, 3.9, 5.8)):
        add_cube("Sofa_%02d" % i, (x, 1.0 + (i % 2) * 0.7, 0.65), (0.78, 1.05, 0.35), fabric, bevel=0.18, subdivision=2)
        add_cube("Table_%02d" % i, (x, -1.0, 1.05), (0.9, 0.65, 0.08), wood, bevel=0.08, subdivision=1)
        for leg_x in (-0.68, 0.68):
            add_cube("TableLeg_%02d" % i, (x + leg_x, -1.0, 0.5), (0.07, 0.07, 0.5), metal, bevel=0.03)

    # Dense repeated decor deliberately uses separate meshes, not instances.
    for i in range(32):
        angle = i * math.tau / 32
        radius = 4.5 + (i % 3) * 0.35
        obj = add_uv_object("Decor_Sphere_%03d" % i,
                            (math.cos(angle) * radius, math.sin(angle) * 2.0 - 1.5, 0.4 + (i % 4) * 0.2),
                            (0.18, 0.18, 0.18), metal if i % 2 else glass, segments=32, rings=24, subdivision=1)
        obj.rotation_euler = (angle, angle * 0.5, angle * 0.25)

    for i in range(24):
        x = -7.0 + (i % 8) * 2.0
        y = -5.0 + (i // 8) * 1.3
        trunk = add_uv_object("Plant_Trunk_%02d" % i, (x, y, 0.7), (0.12, 0.12, 0.9), wood, 24, 16, 1)
        trunk.rotation_euler[1] = (i % 5) * 0.08
        for leaf in range(5):
            add_uv_object("Plant_Leaf_%02d_%02d" % (i, leaf),
                          (x + (leaf - 2) * 0.13, y, 1.35 + leaf * 0.12),
                          (0.35, 0.12, 0.55), fabric, 24, 16, 1)

    lights = []
    for i in range(24):
        angle = i * math.tau / 24
        light = add_light("Stress_Light_%02d" % i, "AREA" if i % 3 else "POINT",
                          (math.cos(angle) * 6.0, math.sin(angle) * 4.0, 1.0 + (i % 5)),
                          350 + (i % 5) * 100, (0.45 + (i % 2) * 0.4, 0.55, 1.0))
        if light.data.type == "AREA":
            light.data.shape = "DISK"
            light.data.size = 1.8
        point_camera(light, Vector((0, 0, 1.5)))
        lights.append(light)

    bpy.ops.object.camera_add(location=(13.5, -16.0, 9.5))
    camera = bpy.context.object
    camera.name = "Stress_Camera"
    camera.data.lens = 32
    camera.data.dof.use_dof = True
    camera.data.dof.focus_object = bpy.data.objects.get("Table_03")
    camera.data.dof.aperture_fstop = 1.2
    point_camera(camera, Vector((0, 1, 1.7)))
    scene.camera = camera

    if profile == "heavy-animation":
        camera.location = (13.5, -16.0, 9.5)
        point_camera(camera, Vector((0, 1, 1.7)))
        camera.keyframe_insert("location", frame=1)
        camera.keyframe_insert("rotation_euler", frame=1)
        camera.location = (-12.0, -13.0, 6.5)
        point_camera(camera, Vector((0, 1, 1.7)))
        camera.keyframe_insert("location", frame=MAX_FRAMES // 2)
        camera.keyframe_insert("rotation_euler", frame=MAX_FRAMES // 2)
        camera.location = (10.0, -10.0, 4.5)
        point_camera(camera, Vector((0, 1, 1.7)))
        camera.keyframe_insert("location", frame=MAX_FRAMES)
        camera.keyframe_insert("rotation_euler", frame=MAX_FRAMES)
        for obj in [item for item in bpy.context.scene.objects if item.type == "MESH"][:80]:
            obj.rotation_euler[2] += 0.35
            obj.keyframe_insert("rotation_euler", frame=1)
            obj.rotation_euler[2] += 1.2
            obj.keyframe_insert("rotation_euler", frame=MAX_FRAMES)
        for light in lights:
            light.data.energy *= 0.75
            light.data.keyframe_insert("energy", frame=1)
            light.data.energy *= 1.8
            light.data.keyframe_insert("energy", frame=MAX_FRAMES // 2)
            light.data.energy *= 0.55
            light.data.keyframe_insert("energy", frame=MAX_FRAMES)

    scene["cws_stress_test"] = True
    scene["cws_render_engine"] = scene.render.engine
    scene["cws_profile"] = profile
    scene["cws_bounds"] = "1280x720, max 48 frames, max 240 objects, max 32 lights"


def main() -> None:
    args = arguments()
    if args.profile == "heavy-animation" and MAX_FRAMES > 48:
        raise RuntimeError("animation bound exceeded")
    clear_scene()
    scene = bpy.context.scene
    configure_render(scene, args.profile)
    build_scene(scene, args.profile)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output.resolve()))
    print("CWS_STRESS_SCENE_CREATED", args.output.resolve(), scene.render.engine, args.profile)


if __name__ == "__main__":
    main()
