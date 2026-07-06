import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const Parameters = Schema.Struct({
  action: Schema.String,
  title: Schema.optional(Schema.String),
  width: Schema.optional(Schema.Number),
  height: Schema.optional(Schema.Number),
  x: Schema.optional(Schema.Number),
  y: Schema.optional(Schema.Number),
})

async function findWindow(title: string) {
  const { getWindows } = await import("@nut-tree-fork/nut-js")
  const windows = await getWindows()
  for (const w of windows) {
    try {
      const t = await w.getTitle()
      if (t?.toLowerCase().includes(title.toLowerCase())) return w
    } catch {}
  }
  return undefined
}

async function handleAction(params: { action: string; title?: string; width?: number; height?: number; x?: number; y?: number }) {
  const { getWindows, Size, Point } = await import("@nut-tree-fork/nut-js")

  switch (params.action) {
    case "list": {
      const windows = await getWindows()
      const titles: string[] = []
      for (const w of windows) {
        try { const t = await w.getTitle(); if (t) titles.push(t) } catch {}
      }
      return `Open windows (${titles.length}):\n${titles.slice(0, 20).join("\n")}`
    }
    case "focus": {
      const t = await findWindow(params.title!)
      if (t) { await t.focus(); return `Focused: ${params.title}` }
      return `Window "${params.title}" not found`
    }
    case "minimize": {
      const t = await findWindow(params.title!)
      if (t) { await t.minimize(); return `Minimized: ${params.title}` }
      return `Window "${params.title}" not found`
    }
    case "close": {
      const t = await findWindow(params.title!)
      if (t) { await t.restore(); return `Closed: ${params.title}` }
      return `Window "${params.title}" not found`
    }
    case "resize": {
      const t = await findWindow(params.title!)
      if (t) { await t.resize(new Size(params.width!, params.height!)); return `Resized to ${params.width}x${params.height}` }
      return `Window "${params.title}" not found`
    }
    case "move": {
      const t = await findWindow(params.title!)
      if (t) { await t.move(new Point(params.x!, params.y!)); return `Moved to (${params.x}, ${params.y})` }
      return `Window "${params.title}" not found`
    }
  }
}

export const DesktopWindowTool = Tool.define(
  "desktop_window",
  Effect.gen(function* () {
    return {
      description: "Manage desktop windows: list, focus, minimize, close, resize, or move.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({ permission: "desktop_window", patterns: ["desktop_window"], always: ["desktop_window"], metadata: { action: params.action } })
          try {
            const output = yield* Effect.promise(() => handleAction(params as any))
            return { title: `Window: ${params.action}`, metadata: { action: params.action }, output }
          } catch (error) {
            return { title: "Window error", metadata: {}, output: `Failed: ${error instanceof Error ? error.message : String(error)}` }
          }
        }),
    }
  }),
)
