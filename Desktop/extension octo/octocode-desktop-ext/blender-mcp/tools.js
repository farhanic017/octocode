// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
/**
 * OctoCode Blender MCP — Tool Definitions
 * Register these tools in OctoCode's tool system to control Blender.
 * 
 * The Blender addon (addon.py) must be installed and running in Blender.
 * This client connects to it via TCP on port 9876.
 */
const BlenderMCPClient = require("C:\\Users\\Farhan\\Desktop\\extension octo\\octocode-desktop-ext\\blender-mcp\\client.js").BlenderMCPClient
const { z } = require("zod")

let client = null

function getClient() {
  if (!client) client = new BlenderMCPClient()
  return client
}

function wrapAsync(fn) {
  return async (args, ctx) => {
    try {
      const c = getClient()
      await c.connect()
      return await fn(args, c)
    } catch (e) {
      return { title: "Blender Error", output: e.message }
    }
  }
}

const blenderConnect = {
  description: "Connect to Blender. Start the OctoCode MCP addon in Blender first (sidebar > OctoCode > Start Server).",
  args: {},
  execute: wrapAsync(async (args, c) => {
    await c.ping()
    return { title: "Blender Connected", output: "Successfully connected to Blender MCP server on port 9876" }
  }),
}

const blenderSceneInfo = {
  description: "Get full scene information — all objects, types, locations, materials, modifiers.",
  args: {},
  execute: wrapAsync(async (args, c) => {
    const info = await c.getSceneInfo()
    return { title: "Scene Info", output: JSON.stringify(info, null, 2) }
  }),
}

const blenderObjectInfo = {
  description: "Get detailed info about a specific object.",
  args: { name: z.string().describe("Object name") },
  execute: wrapAsync(async (args, c) => {
    const info = await c.getObjectInfo(args.name)
    return { title: `Object: ${args.name}`, output: JSON.stringify(info, null, 2) }
  }),
}

const blenderExecute = {
  description: "Execute Python code inside Blender. bpy module is available. Break complex tasks into small steps.",
  args: { code: z.string().describe("Python code to execute") },
  execute: wrapAsync(async (args, c) => {
    const result = await c.executeCode(args.code)
    return { title: "Code Executed", output: typeof result === "string" ? result : JSON.stringify(result) }
  }),
}

const blenderScreenshot = {
  description: "Capture a screenshot of the current Blender 3D viewport.",
  args: {
    filepath: z.string().optional().describe("Path to save screenshot (optional, defaults to temp dir)")
  },
  execute: wrapAsync(async (args, c) => {
    const fp = args.filepath || path.join(os.tmpdir(), `octocode_blender_${Date.now()}.png`)
    const result = await c.getViewportScreenshot(fp)
    const attachments = []
    if (fs.existsSync(fp)) {
      attachments.push({ type: "file", mime: "image/png", url: fp })
    }
    return { title: "Viewport Screenshot", output: "Screenshot captured", attachments }
  }),
}

const blenderDeleteAll = {
  description: "Delete all objects in the Blender scene.",
  args: {},
  execute: wrapAsync(async (args, c) => {
    await c.executeCode(`
import bpy
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
result = "Scene cleared"
    `)
    return { title: "Scene Cleared", output: "All objects deleted from scene" }
  }),
}

const blenderAddMesh = {
  description: "Add a mesh primitive to the scene.",
  args: {
    type: z.string().describe("cube, sphere, cylinder, cone, torus, plane, circle, monkey"),
    name: z.string().optional().describe("Object name"),
    location: z.string().optional().describe("X,Y,Z (e.g. '0,0,1')"),
    scale: z.string().optional().describe("X,Y,Z (e.g. '1,1,1')"),
  },
  execute: wrapAsync(async (args, c) => {
    const meshMap = {
      cube: "primitive_cube_add",
      sphere: "primitive_uv_sphere_add",
      cylinder: "primitive_cylinder_add",
      cone: "primitive_cone_add",
      torus: "primitive_torus_add",
      plane: "primitive_plane_add",
      circle: "primitive_circle_add",
      monkey: "primitive_monkey_add",
    }
    const op = meshMap[args.type.toLowerCase()]
    if (!op) return { title: "Error", output: `Unknown mesh type: ${args.type}. Use: ${Object.keys(meshMap).join(", ")}` }

    let loc = "0, 0, 0"
    if (args.location) loc = args.location.replace(/,/g, ", ")

    let code = `bpy.ops.mesh.${op}(location=(${loc}))`
    if (args.name) code += `\nbpy.context.active_object.name = "${args.name}"`

    await c.executeCode(code)
    return { title: `Added ${args.type}`, output: `Created ${args.type}${args.name ? ` named "${args.name}"` : ""} at (${loc})` }
  }),
}

const blenderSetMaterial = {
  description: "Set a material with base color on an object.",
  args: {
    object_name: z.string().describe("Object name"),
    color: z.string().describe("RGB 0-1 (e.g. '0.8,0.2,0.2' for red)"),
    metallic: z.number().optional().describe("0-1 (default 0)"),
    roughness: z.number().optional().describe("0-1 (default 0.5)"),
  },
  execute: wrapAsync(async (args, c) => {
    const rgb = args.color.split(",").map(Number)
    const m = args.metallic || 0
    const r = args.roughness !== undefined ? args.roughness : 0.5
    const code = `
import bpy
obj = bpy.data.objects.get("${args.object_name}")
if obj:
    mat = bpy.data.materials.new(name="${args.object_name}_mat")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (${rgb[0]}, ${rgb[1]}, ${rgb[2] || 0}, 1)
    bsdf.inputs["Metallic"].default_value = ${m}
    bsdf.inputs["Roughness"].default_value = ${r}
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    result = f"Material set on {obj.name}"
else:
    result = f"Object '${args.object_name}' not found"
`
    await c.executeCode(code)
    return { title: "Material Set", output: `Applied material to ${args.object_name}` }
  }),
}

const blenderRender = {
  description: "Render the current scene to an image file.",
  args: {
    filepath: z.string().optional().describe("Output path (default: Desktop/render.png)"),
    engine: z.string().optional().describe("EEVEE or CYCLES (default EEVEE)"),
  },
  execute: wrapAsync(async (args, c) => {
    const fp = args.filepath || path.join(os.homedir(), "Desktop", "render.png")
    const engine = (args.engine || "EEVEE").toUpperCase()
    const code = `
import bpy
bpy.context.scene.render.engine = 'BLENDER_EEVEE' if '${engine}' == 'EEVEE' else 'CYCLES'
bpy.context.scene.render.filepath = r"${fp}"
bpy.ops.render.render(write_still=True)
result = f"Rendered to ${fp}"
`
    await c.executeCode(code)
    const attachments = []
    if (fs.existsSync(fp)) {
      attachments.push({ type: "file", mime: "image/png", url: fp })
    }
    return { title: "Render Complete", output: `Scene rendered to ${fp}`, attachments }
  }),
}

export {
  blenderConnect,
  blenderSceneInfo,
  blenderObjectInfo,
  blenderExecute,
  blenderScreenshot,
  blenderDeleteAll,
  blenderAddMesh,
  blenderSetMaterial,
  blenderRender,
}
