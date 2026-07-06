# Copyright (C) 2026 Farhan Dhrubo
# SPDX-License-Identifier: GPL-3.0-or-later
# This file is part of OctoCode Desktop Extension.
import bpy
import math

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# === MATERIALS (all created first, then assigned) ===

def make_mat(name, color, metallic=0, roughness=0.5, emission=None, em_strength=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = em_strength
    return mat

mat_floor     = make_mat("Floor", (0.08, 0.06, 0.04), roughness=0.7)
mat_wall      = make_mat("Wall", (0.92, 0.88, 0.82), roughness=0.95)
mat_wall2     = make_mat("Wall2", (0.88, 0.84, 0.78), roughness=0.95)
mat_wood      = make_mat("Wood", (0.45, 0.28, 0.12), roughness=0.55)
mat_metal     = make_mat("Metal", (0.7, 0.7, 0.72), metallic=0.9, roughness=0.15)
mat_black     = make_mat("BlackPlastic", (0.04, 0.04, 0.05), metallic=0.3, roughness=0.2)
mat_white     = make_mat("Ceramic", (0.95, 0.93, 0.9), roughness=0.15)
mat_coffee    = make_mat("Coffee", (0.12, 0.06, 0.02), roughness=0.1, metallic=0.05)
mat_screen    = make_mat("Screen", (0.01, 0.01, 0.02), emission=(0.15, 0.3, 0.8), em_strength=3)
mat_screen2   = make_mat("ScreenGlow", (0.3, 0.6, 1.0), emission=(0.4, 0.7, 1.0), em_strength=5)
mat_book_red  = make_mat("BookRed", (0.65, 0.15, 0.1), roughness=0.7)
mat_book_blue = make_mat("BookBlue", (0.1, 0.25, 0.55), roughness=0.7)
mat_book_gold = make_mat("BookGold", (0.6, 0.5, 0.15), roughness=0.6)
mat_plant     = make_mat("Plant", (0.15, 0.45, 0.12), roughness=0.8)
mat_pot       = make_mat("Pot", (0.55, 0.35, 0.2), roughness=0.6)
mat_glass     = make_mat("Glass", (0.95, 0.95, 0.97), roughness=0.02, metallic=0.0)
mat_pillow    = make_mat("Pillow", (0.2, 0.15, 0.35), roughness=0.9)
mat_rug       = make_mat("Rug", (0.25, 0.18, 0.12), roughness=0.95)

# === FLOOR ===
bpy.ops.mesh.primitive_plane_add(size=16, location=(0, 0, 0))
floor = bpy.context.active_object
floor.name = "Floor"
floor.data.materials.append(mat_rug)

# === WALLS ===
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -4, 2.5))
w = bpy.context.active_object; w.name = "WallBack"; w.scale = (8, 0.12, 5)
bpy.ops.object.transform_apply(scale=True); w.data.materials.append(mat_wall)

bpy.ops.mesh.primitive_cube_add(size=1, location=(-4, 0, 2.5))
w2 = bpy.context.active_object; w2.name = "WallLeft"; w2.scale = (0.12, 8, 5)
bpy.ops.object.transform_apply(scale=True); w2.data.materials.append(mat_wall2)

# === TABLE ===
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.78))
tt = bpy.context.active_object; tt.name = "TableTop"
tt.scale = (1.4, 0.75, 0.04); bpy.ops.object.transform_apply(scale=True)
tt.data.materials.append(mat_wood)

for pos in [(-0.55,-0.3,0.37),(0.55,-0.3,0.37),(-0.55,0.3,0.37),(0.55,0.3,0.37)]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=0.74, location=pos)
    l = bpy.context.active_object; l.name = "Leg"; l.data.materials.append(mat_metal)

# === LAPTOP ===
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.2, 0, 0.82))
lb = bpy.context.active_object; lb.name = "LaptopBase"
lb.scale = (0.45, 0.32, 0.012); bpy.ops.object.transform_apply(scale=True)
lb.data.materials.append(mat_black)

bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.2, -0.24, 1.0))
ls = bpy.context.active_object; ls.name = "LaptopScreen"
ls.scale = (0.43, 0.008, 0.28)
bpy.ops.object.transform_apply(scale=True)
ls.rotation_euler = (math.radians(-12), 0, 0)
ls.data.materials.append(mat_screen)

# Screen content: a glowing UI strip
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.2, -0.235, 1.0))
sg = bpy.context.active_object; sg.name = "ScreenGlow"
sg.scale = (0.38, 0.005, 0.04)
bpy.ops.object.transform_apply(scale=True)
sg.rotation_euler = (math.radians(-12), 0, 0)
sg.data.materials.append(mat_screen2)

# === COFFEE MUG ===
bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=0.1, location=(0.45, 0.05, 0.87))
mug = bpy.context.active_object; mug.name = "Mug"; mug.data.materials.append(mat_white)

bpy.ops.mesh.primitive_torus_add(major_radius=0.055, minor_radius=0.008, location=(0.51, 0.05, 0.87))
handle = bpy.context.active_object; handle.name = "Handle"; handle.rotation_euler = (0, math.radians(90), 0)
handle.data.materials.append(mat_white)

bpy.ops.mesh.primitive_cylinder_add(radius=0.048, depth=0.015, location=(0.45, 0.05, 0.91))
coffee = bpy.context.active_object; coffee.name = "Coffee"; coffee.data.materials.append(mat_coffee)

# === BOOKS ===
for i, y in enumerate([0.2, 0.22, 0.24]):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.6, y, 0.84 + i*0.035))
    bk = bpy.context.active_object; bk.name = f"Book{i}"
    bk.scale = (0.11, 0.16, 0.018); bpy.ops.object.transform_apply(scale=True)
    bk.rotation_euler = (0, 0, math.radians(5 * (i-1)))
    mats = [mat_book_red, mat_book_blue, mat_book_gold]
    bk.data.materials.append(mats[i])

# === SMALL PLANT ===
bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.08, location=(0.55, -0.15, 0.85))
pot = bpy.context.active_object; pot.name = "PlantPot"; pot.data.materials.append(mat_pot)

for angle in range(0, 360, 60):
    r = math.radians(angle)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.03, location=(0.55 + math.cos(r)*0.02, -0.15 + math.sin(r)*0.02, 0.92))
    leaf = bpy.context.active_object; leaf.name = "Leaf"; leaf.data.materials.append(mat_plant)

# === GLASS (empty wine glass) ===
bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.12, location=(-0.35, 0.15, 0.88))
glass_body = bpy.context.active_object; glass_body.name = "GlassBody"
glass_body.scale = (1, 1, 1); glass_body.data.materials.append(mat_glass)

bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=0.008, location=(-0.35, 0.15, 0.82))
glass_base = bpy.context.active_object; glass_base.name = "GlassBase"; glass_base.data.materials.append(mat_glass)

# === DECORATIVE ITEM: Small sculpture ===
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.04, location=(0.1, -0.1, 0.86))
orb = bpy.context.active_object; orb.name = "Orb"; orb.data.materials.append(mat_metal)

# === LIGHTING (3-point setup) ===
# Key light — warm, bright
bpy.ops.object.light_add(type='AREA', location=(2.5, -1.5, 3.8))
key = bpy.context.active_object; key.name = "KeyLight"
key.data.energy = 600; key.data.size = 1.2
key.data.color = (1.0, 0.88, 0.7)
key.rotation_euler = (math.radians(50), 0, math.radians(35))

# Fill light — cool, softer
bpy.ops.object.light_add(type='AREA', location=(-2, 2, 3))
fill = bpy.context.active_object; fill.name = "FillLight"
fill.data.energy = 180; fill.data.size = 2.5
fill.data.color = (0.75, 0.82, 1.0)
fill.rotation_euler = (math.radians(55), 0, math.radians(-40))

# Rim light — accent from behind
bpy.ops.object.light_add(type='POINT', location=(0, -3.5, 4))
rim = bpy.context.active_object; rim.name = "RimLight"
rim.data.energy = 300; rim.data.color = (1.0, 0.95, 0.85)

# === CAMERA (better composition) ===
bpy.ops.object.camera_add(location=(2.2, -1.8, 1.9))
cam = bpy.context.active_object; cam.name = "Camera"
cam.rotation_euler = (math.radians(72), 0, math.radians(42))
bpy.context.scene.camera = cam

# === RENDER ===
bpy.context.scene.render.engine = 'BLENDER_EEVEE'
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080

world = bpy.context.scene.world
if not world:
    world = bpy.data.worlds.new("World"); bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.015, 0.012, 0.02, 1)
bg.inputs["Strength"].default_value = 0.3

# Render
bpy.context.scene.render.filepath = r"C:\Users\Farhan\Desktop\octocode_scene.png"
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=r"C:\Users\Farhan\Desktop\octocode_scene.blend")
print("Done! Rendered realistic scene.")
