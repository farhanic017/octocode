// Copyright (C) 2026 Farhan Dhrubo
// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of OctoCode Desktop Extension.
import { z } from "zod"
import { tool } from "./helper"
import { DesktopGuardrailService } from "../../octocode/packages/octocode/src/guardrail/desktop-guardrail"

// Module-level state for screen recording (persists across calls)
let _isRecording = false
let _frames = 0
let _interval: ReturnType<typeof setInterval> | null = null
let _lastScreenshot: string | null = null
const guardrail = new DesktopGuardrailService()

// Cached app registry — built once, reused across launches
let _appRegistry: Record<string, { appID: string; type: "desktop" | "browser" | "store" }> | null = null

async function getAppRegistry(): Promise<typeof _appRegistry> {
  if (_appRegistry) return _appRegistry
  const { execSync } = await import("child_process")
  try {
    const raw = execSync(
      'powershell -Command "Get-StartApps | ForEach-Object { \\"$($_.Name)|$($_.AppID)\\" }"',
      { encoding: "utf8", windowsHide: true }
    )
    const registry: Record<string, { appID: string; type: "desktop" | "browser" | "store" }> = {}
    for (const line of raw.split("\n")) {
      const [name, appID] = line.trim().split("|")
      if (!name || !appID || appID === "\\") continue
      const type = appID.includes(".crx_") || appID.includes("chrome-extension://")
        ? "browser"
        : appID.includes("squirrel") || appID.includes("wekyb") || appID.includes("!App")
          ? "desktop"
          : "store"
      registry[name.toLowerCase()] = { appID, type }
    }
    _appRegistry = registry
    return _appRegistry
  } catch {
    return null
  }
}

export const desktop_screenshot = tool({
  description: "Capture a screenshot of the desktop. Returns base64 PNG image.",
  args: {
    region: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).optional().describe("Optional region to capture"),
  },
  async execute(args, ctx) {
    const { rawToBase64 } = await import("../src/octocode-desktop/img-util.js")
    const { screen, Region } = await import("@nut-tree-fork/nut-js")

    let img
    if (args.region) {
      img = await screen.grabRegion(new Region(args.region.x, args.region.y, args.region.width, args.region.height))
    } else {
      img = await screen.grab()
    }

    const base64 = rawToBase64(img.data, img.width, img.height, img.channels)
    _lastScreenshot = base64

    const { optimizeScreenshot } = require("../src/octocode-desktop/img-optimize.cjs")
    const optimized = await optimizeScreenshot(base64)

    if (optimized.duplicate) {
      return { title: "Desktop screenshot", output: "Screenshot unchanged (deduped)", attachments: [] }
    }

    return {
      title: "Desktop screenshot",
      output: `Captured ${img.width}x${img.height} → ${optimized.width}x${optimized.height} JPEG (${Math.round(optimized.sizeBytes / 1024)}KB)`,
      attachments: [{ type: "file", mime: "image/jpeg", url: `data:image/jpeg;base64,${optimized.base64}` }],
    }
  },
})

export const desktop_control = tool({
  description: "Control mouse and keyboard on the desktop. Click, type, scroll, drag, press keys.",
  args: {
    action: z.enum(["click", "double_click", "move", "type", "clip_paste", "key", "scroll", "drag", "snap_right", "snap_left", "maximize", "close_window"]),
    x: z.number().optional().describe("X coordinate"),
    y: z.number().optional().describe("Y coordinate"),
    text: z.string().optional().describe("Text to type"),
    key: z.string().optional().describe("Key to press (Enter, Tab, Escape, etc.)"),
    direction: z.enum(["up", "down"]).optional().describe("Scroll direction"),
    amount: z.number().optional().describe("Scroll amount"),
    from_x: z.number().optional().describe("Drag start X"),
    from_y: z.number().optional().describe("Drag start Y"),
    to_x: z.number().optional().describe("Drag end X"),
    to_y: z.number().optional().describe("Drag end Y"),
    button: z.enum(["left", "right", "middle"]).optional().describe("Mouse button"),
    screenshot_after: z.boolean().optional().describe("Capture screenshot after action"),
  },
  async execute(args, ctx) {
    const check = guardrail.checkDesktopAction("desktop_control", args as Record<string, unknown>)
    if (check.blocked) {
      return { title: "Blocked by guardrail", output: check.reason }
    }
    if (check.needsConfirmation) {
      return { title: "Requires confirmation", output: check.confirmMessage || "Action requires user approval" }
    }

    const { fork } = await import("child_process")
    const path = await import("path")
    const workerPath = path.join(__dirname, "nut-persistent-worker.cjs")
    const worker = fork(workerPath, [], { stdio: ["pipe", "pipe", "pipe", "ipc"] })

    const actionId = `${Date.now()}-${Math.random()}`
    const actionData = {
      id: actionId,
      args: {
        action: args.action,
        x: args.x, y: args.y,
        text: args.text, key: args.key,
        direction: args.direction, amount: args.amount,
        from_x: args.from_x, from_y: args.from_y,
        to_x: args.to_x, to_y: args.to_y,
        button: args.button,
      },
    }

    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      worker.on("message", (msg) => { resolve(msg); worker.kill() })
      worker.on("error", (err) => { resolve({ success: false, error: err.message }); worker.kill() })
      setTimeout(() => { resolve({ success: false, error: "timeout" }); worker.kill() }, 10000)
      worker.send(actionData)
    })

    if (!result.success) {
      return { title: `Desktop: ${args.action} failed`, output: result.error || "Unknown error" }
    }

    let attachments: any[] | undefined
    if (args.screenshot_after) {
      const { rawToBase64 } = await import("../src/octocode-desktop/img-util.js")
      const { screen } = await import("@nut-tree-fork/nut-js")
      const img = await screen.grab()
      const base64 = rawToBase64(img.data, img.width, img.height, img.channels)
      _lastScreenshot = base64
      attachments = [{ type: "file", mime: "image/png", url: `data:image/png;base64,${base64}` }]
    }

    return {
      title: `Desktop: ${args.action}`,
      output: `Action ${args.action} completed.`,
      attachments,
    }
  },
})

export const desktop_clipboard = tool({
  description: "Read from or write to the system clipboard.",
  args: {
    action: z.enum(["get", "set"]),
    text: z.string().optional().describe("Text to set (for 'set' action)"),
  },
  async execute(args, ctx) {
    if (args.action === "set" && args.text) {
      const check = guardrail.checkDesktopAction("desktop_control", { action: "type", text: args.text })
      if (check.blocked) return { title: "Blocked", output: check.reason }
    }

    const mod = await import("clipboardy")
    const cb = mod.default || mod

    if (args.action === "get") {
      const content = await cb.read()
      return { title: "Clipboard", output: `Clipboard: "${content}"` }
    } else {
      await cb.write(args.text!)
      return { title: "Clipboard set", output: `Set clipboard to: "${args.text}"` }
    }
  },
})

export const desktop_window = tool({
  description: "Manage desktop windows: list, focus, or find windows by title.",
  args: {
    action: z.enum(["list", "focus"]),
    title: z.string().optional().describe("Window title to find"),
  },
  async execute(args, ctx) {
    const { getWindows } = await import("@nut-tree-fork/nut-js")

    if (args.action === "list") {
      const windows = await getWindows()
      const titles: string[] = []
      for (const w of windows) {
        try { const t = await w.getTitle(); if (t) titles.push(t) } catch {}
      }
      return { title: "Windows", output: `Open windows (${titles.length}):\n${titles.slice(0, 20).join("\n")}` }
    }

    const windows = await getWindows()
    for (const w of windows) {
      try {
        const t = await w.getTitle()
        if (t?.toLowerCase().includes(args.title!.toLowerCase())) {
          await w.focus()
          return { title: "Window focused", output: `Focused: ${t}` }
        }
      } catch {}
    }
    return { title: "Window not found", output: `Window "${args.title}" not found` }
  },
})

export const desktop_open_app = tool({
  description: "Launch a desktop app or web app. Auto-detects installed type (desktop/web/browser). Snaps to right half for split view.",
  args: {
    app: z.string().describe("Application name"),
    args: z.array(z.string()).optional().describe("Arguments to pass"),
    split_view: z.boolean().optional().describe("Snap to right half after opening (default true)"),
  },
  async execute(args, ctx) {
    const check2 = guardrail.checkDesktopAction("desktop_open_app", args as Record<string, unknown>)
    if (check2.blocked) return { title: "Blocked by guardrail", output: check2.reason }

    const { execSync, fork } = await import("child_process")
    const path = await import("path")
    const app = args.app
    const argStr = args.args?.join(" ") ?? ""
    let launchInfo = ""

    if (process.platform === "win32") {
      // Use cached registry for instant lookup
      const registry = await getAppRegistry()
      const entry = registry?.[app.toLowerCase()]

      if (entry) {
        if (entry.type === "browser") {
          const urlMap: Record<string, string> = {
            "spotify": "https://open.spotify.com",
            "youtube": "https://youtube.com",
            "figma": "https://figma.com",
            "canva": "https://canva.com",
          }
          const url = urlMap[app.toLowerCase()] || `https://${app.toLowerCase()}.com`
          execSync(`cmd /c start "" "${url}"`, { windowsHide: true })
          launchInfo = `Web app: opened ${url}`
        } else {
          execSync(`explorer.exe "shell:AppsFolder\\${entry.appID}"`, { windowsHide: true })
          launchInfo = `Desktop app: launched via Start Menu`
        }
      } else {
        try {
          execSync(`cmd /c start "" "${app}" ${argStr}`, { windowsHide: true })
          launchInfo = `Launched "${app}" by name`
        } catch {
          return { title: `Not found`, output: `"${app}" not found on this system` }
        }
      }
    } else if (process.platform === "darwin") {
      execSync(`open -a "${app}" ${argStr}`)
      launchInfo = `Launched ${app}`
    } else {
      execSync(`${app} ${argStr} &`, { shell: "bash" })
      launchInfo = `Launched ${app}`
    }

    // Auto-snap to right half for split view
    const shouldSnap = args.split_view !== false
    if (shouldSnap && process.platform === "win32") {
      await new Promise(r => setTimeout(r, 2000))

      // Focus the newest foreground window (the one we just opened)
      try {
        const focusPs = `powershell -Command "Add-Type @' using System; using System.Runtime.InteropServices; public class W { [DllImport(\\\"user32.dll\\\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\\\"user32.dll\\\")] public static extern bool SetForegroundWindow(IntPtr h); } '@; [W]::SetForegroundWindow([W]::GetForegroundWindow())"`
        execSync(focusPs, { windowsHide: true })
      } catch {}

      await new Promise(r => setTimeout(r, 200))

      const workerPath = path.join(__dirname, "nut-persistent-worker.cjs")
      const worker = fork(workerPath, [], { stdio: ["pipe", "pipe", "pipe", "ipc"] })
      await new Promise<void>((resolve) => {
        worker.on("message", () => { resolve(); worker.kill() })
        worker.on("error", () => { resolve(); worker.kill() })
        setTimeout(() => { resolve(); worker.kill() }, 3000)
        worker.send({ id: "snap", args: { action: "snap_right" } })
      })
      launchInfo += " (snapped right)"
    }

    return { title: `Opened ${app}`, output: launchInfo }
  },
})

export const desktop_close_app = tool({
  description: "Close an app by name or close all apps opened by the agent.",
  args: {
    app: z.string().optional().describe("App name to close. Omit to close all agent-opened apps."),
  },
  async execute(args, ctx) {
    const { execSync, fork } = await import("child_process")
    const path = await import("path")

    if (!args.app) {
      const opened = (globalThis as any).__octoOpenedApps || []
      if (opened.length === 0) return { title: "No apps to close", output: "No agent-opened apps tracked" }

      for (const app of opened) {
        try { execSync(`taskkill /IM "${app}.exe" /F`, { windowsHide: true }) } catch {}
      }
      globalThis.__octoOpenedApps = []
      return { title: "All apps closed", output: `Closed: ${opened.join(", ")}` }
    }

    const workerPath = path.join(__dirname, "nut-persistent-worker.cjs")
    const focusWorker = fork(workerPath, [], { stdio: ["pipe", "pipe", "pipe", "ipc"] })
    await new Promise<void>((resolve) => {
      focusWorker.on("message", () => { resolve(); focusWorker.kill() })
      focusWorker.on("error", () => { resolve(); focusWorker.kill() })
      setTimeout(() => { resolve(); focusWorker.kill() }, 3000)
      focusWorker.send({ id: "close", args: { action: "close_window" } })
    })

    try { execSync(`taskkill /IM "${args.app}.exe"`, { windowsHide: true }) } catch {}

    return { title: `Closed ${args.app}`, output: `App ${args.app} closed` }
  },
})

export const desktop_batch = tool({
  description: "Run multiple desktop actions in sequence in a single worker process. 9-15x faster than individual calls.",
  args: {
    actions: z.array(z.object({
      action: z.string(),
      x: z.number().optional(),
      y: z.number().optional(),
      text: z.string().optional(),
      key: z.string().optional(),
      keys: z.array(z.string()).optional(),
      delay: z.number().optional().describe("Delay in ms after this action"),
    })).describe("Actions to run in sequence"),
  },
  async execute(args, ctx) {
    const { fork } = await import("child_process")
    const path = await import("path")
    const workerPath = path.join(__dirname, "nut-persistent-worker.cjs")
    const worker = fork(workerPath, [], { stdio: ["pipe", "pipe", "pipe", "ipc"] })

    const actionId = `batch-${Date.now()}`
    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      worker.on("message", (msg) => { resolve(msg); worker.kill() })
      worker.on("error", (err) => { resolve({ success: false, error: err.message }); worker.kill() })
      setTimeout(() => { resolve({ success: false, error: "timeout" }); worker.kill() }, 30000)
      worker.send({ id: actionId, batch: args.actions })
    })

    return {
      title: `Batch: ${args.actions.length} actions`,
      output: result.success ? `All ${args.actions.length} actions completed` : `Failed: ${result.error}`,
    }
  },
})

export const desktop_screen_record = tool({
  description: "Record desktop screen frames. Actions: start, stop, status.",
  args: {
    action: z.enum(["start", "stop", "status"]),
    fps: z.number().optional().describe("Frames per second (default 10)"),
  },
  async execute(args, ctx) {
    const { captureScreenBase64 } = await import("../src/octocode-desktop/img-util.js")

    if (args.action === "start") {
      const fps = args.fps ?? 10
      _isRecording = true
      _frames = 0
      _interval = setInterval(async () => {
        if (_isRecording) {
          try {
            const b64 = await captureScreenBase64()
            _lastScreenshot = b64
            _frames++
          } catch {}
        }
      }, 1000 / fps)
      return { title: "Recording started", output: `Recording at ${fps} fps` }
    }

    if (args.action === "stop") {
      if (_interval) clearInterval(_interval)
      _interval = null
      const wasRecording = _isRecording
      _isRecording = false
      return { title: "Recording stopped", output: wasRecording ? `Captured ${_frames} frames` : "Was not recording" }
    }

    return {
      title: "Recording status",
      output: _isRecording ? `Recording: ${_frames} frames` : "Not recording",
      attachments: _lastScreenshot ? [{ type: "file", mime: "image/png", url: `data:image/png;base64,${_lastScreenshot}` }] : undefined,
    }
  },
})
