// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
/**
 * OctoCode Blender MCP Client
 * Connects to the Blender addon's TCP server and exposes tools for OctoCode.
 * 
 * Usage:
 * 1. Install addon.py in Blender (Edit > Preferences > Add-ons > Install)
 * 2. Start the server in Blender's sidebar (OctoCode tab > Start Server)
 * 3. This client connects to localhost:9876
 */
const net = require("net")
const fs = require("fs")
const path = require("path")
const os = require("os")

const DEFAULT_HOST = process.env.BLENDER_HOST || "localhost"
const DEFAULT_PORT = parseInt(process.env.BLENDER_PORT || "9876")
const TIMEOUT_MS = 30000

class BlenderMCPClient {
  constructor(host = DEFAULT_HOST, port = DEFAULT_PORT) {
    this.host = host
    this.port = port
    this.socket = null
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket) { resolve(true); return }
      this.socket = new net.Socket()
      this.socket.setTimeout(TIMEOUT_MS)
      this.socket.connect(this.port, this.host, () => {
        console.log(`Connected to Blender at ${this.host}:${this.port}`)
        resolve(true)
      })
      this.socket.on("error", (err) => {
        this.socket = null
        reject(new Error(`Cannot connect to Blender: ${err.message}. Is the addon running?`))
      })
      this.socket.on("timeout", () => {
        this.socket.destroy()
        this.socket = null
        reject(new Error("Connection timed out"))
      })
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
  }

  sendCommand(type, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Not connected to Blender"))
        return
      }

      const command = JSON.stringify({ type, params })
      let responseData = ""
      const onData = (chunk) => {
        responseData += chunk.toString()
        try {
          const parsed = JSON.parse(responseData)
          this.socket.removeListener("data", onData)
          this.socket.removeListener("error", onErr)
          this.socket.removeListener("timeout", onTimeout)
          if (parsed.status === "error") {
            reject(new Error(parsed.message || "Blender error"))
          } else {
            resolve(parsed.result || {})
          }
        } catch (e) {
          // Incomplete JSON, keep waiting
        }
      }
      const onErr = (err) => {
        this.socket.removeListener("data", onData)
        this.socket.removeListener("error", onErr)
        this.socket.removeListener("timeout", onTimeout)
        this.socket = null
        reject(new Error(`Connection lost: ${err.message}`))
      }
      const onTimeout = () => {
        this.socket.removeListener("data", onData)
        this.socket.removeListener("error", onErr)
        this.socket.removeListener("timeout", onTimeout)
        this.socket = null
        reject(new Error("Blender response timeout"))
      }

      this.socket.on("data", onData)
      this.socket.on("error", onErr)
      this.socket.on("timeout", onTimeout)
      this.socket.write(command)
    })
  }

  async getSceneInfo() { return this.sendCommand("get_scene_info") }
  async getObjectInfo(name) { return this.sendCommand("get_object_info", { name }) }
  async executeCode(code) { return this.sendCommand("execute_code", { code }) }
  async getViewportScreenshot(filepath) { return this.sendCommand("get_viewport_screenshot", { filepath, max_size: 1000, format: "png" }) }
  async ping() { return this.sendCommand("ping") }
}

// OctoCode tool definitions
const BLENDER_TOOLS = [
  {
    name: "blender_connect",
    description: "Connect to Blender. Make sure the OctoCode MCP addon is running in Blender (sidebar > OctoCode > Start Server).",
    args: {},
  },
  {
    name: "blender_scene_info",
    description: "Get information about the current Blender scene — all objects, their types, locations, materials, and modifiers.",
    args: {},
  },
  {
    name: "blender_object_info",
    description: "Get detailed info about a specific object: vertices, faces, materials, modifiers, parent.",
    args: { name: { type: "string", description: "Name of the object" } },
  },
  {
    name: "blender_execute",
    description: "Execute arbitrary Python code inside Blender. Use for creating objects, modifying scenes, running scripts. Break complex tasks into small steps.",
    args: { code: { type: "string", description: "Python code to execute in Blender's context (bpy is available)" } },
  },
  {
    name: "blender_screenshot",
    description: "Capture a screenshot of the current Blender 3D viewport.",
    args: { filepath: { type: "string", description: "Optional file path to save the screenshot" } },
  },
  {
    name: "blender_delete_all",
    description: "Delete all objects in the scene (clear the scene).",
    args: {},
  },
  {
    name: "blender_add_mesh",
    description: "Add a mesh primitive to the scene (cube, sphere, cylinder, cone, torus, plane, circle).",
    args: {
      type: { type: "string", description: "Mesh type: cube, sphere, cylinder, cone, torus, plane, circle, monkey" },
      name: { type: "string", description: "Name for the object" },
      location: { type: "string", description: "X,Y,Z position (e.g. '0,0,1')" },
      scale: { type: "string", description: "X,Y,Z scale (e.g. '1,1,1')" },
    },
  },
  {
    name: "blender_set_material",
    description: "Set a material with a base color on an object.",
    args: {
      object_name: { type: "string", description: "Name of the object" },
      color: { type: "string", description: "RGB color as 'R,G,B' (0-1 range, e.g. '0.8,0.2,0.2' for red)" },
      metallic: { type: "number", description: "Metallic value 0-1 (default 0)" },
      roughness: { type: "number", description: "Roughness value 0-1 (default 0.5)" },
    },
  },
  {
    name: "blender_render",
    description: "Render the current scene. Saves to specified path.",
    args: {
      filepath: { type: "string", description: "Path to save rendered image" },
      engine: { type: "string", description: "Render engine: EEVEE or CYCLES (default EEVEE)" },
    },
  },
]

// Export for OctoCode integration
export { BlenderMCPClient, BLENDER_TOOLS }
