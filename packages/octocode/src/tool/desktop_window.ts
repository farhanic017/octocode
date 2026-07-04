import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { requireDep } from "./lazy-dep"

const WindowActionSchema = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("list"),
  }),
  Schema.Struct({
    action: Schema.Literal("focus"),
    title: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("minimize"),
    title: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("maximize"),
    title: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("close"),
    title: Schema.String,
  }),
  Schema.Struct({
    action: Schema.Literal("resize"),
    title: Schema.String,
    width: Schema.Number,
    height: Schema.Number,
  }),
  Schema.Struct({
    action: Schema.Literal("move"),
    title: Schema.String,
    x: Schema.Number,
    y: Schema.Number,
  }),
])

export const Parameters = Schema.Struct({
  window: WindowActionSchema,
})

async function findWindow(title: string) {
  const nutjs = await requireDep("@nut-tree-fork/nut-js")
  const { window: win } = nutjs
  const windows = await win.getAllWindows()
  return windows.find((w) => w.title?.toLowerCase().includes(title.toLowerCase()))
}

async function handleWindowAction(params: { action: string; title?: string; width?: number; height?: number; x?: number; y?: number }) {
  const nutjs = await requireDep("@nut-tree-fork/nut-js")
  const { Size, Point } = nutjs

  switch (params.action) {
    case "list": {
      const nutjs2 = await requireDep("@nut-tree-fork/nut-js")
      const { window: win } = nutjs2
      const windows = await win.getAllWindows()
      const titles = windows.map((w) => w.title).filter(Boolean)
      return `Open windows:\n${titles.join("\n")}`
    }
    case "focus": {
      const target = await findWindow(params.title!)
      if (target) {
        await target.focus()
        return `Focused window: ${target.title}`
      }
      return `Window "${params.title}" not found`
    }
    case "minimize": {
      const target = await findWindow(params.title!)
      if (target) {
        await target.minimize()
        return `Minimized window: ${target.title}`
      }
      return `Window "${params.title}" not found`
    }
    case "maximize": {
      const target = await findWindow(params.title!)
      if (target) {
        await target.maximize()
        return `Maximized window: ${target.title}`
      }
      return `Window "${params.title}" not found`
    }
    case "close": {
      const target = await findWindow(params.title!)
      if (target) {
        await target.close()
        return `Closed window: ${target.title}`
      }
      return `Window "${params.title}" not found`
    }
    case "resize": {
      const target = await findWindow(params.title!)
      if (target) {
        await target.setSize(new Size(params.width!, params.height!))
        return `Resized window to ${params.width}x${params.height}`
      }
      return `Window "${params.title}" not found`
    }
    case "move": {
      const target = await findWindow(params.title!)
      if (target) {
        await target.setPosition(new Point(params.x!, params.y!))
        return `Moved window to (${params.x}, ${params.y})`
      }
      return `Window "${params.title}" not found`
    }
  }
}

export const DesktopWindowTool = Tool.define(
  "desktop_window",
  Effect.gen(function* () {
    return {
      description: "Manage desktop windows: list, focus, minimize, maximize, close, resize, or move.",
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          yield* ctx.ask({
            permission: "desktop_window",
            patterns: ["desktop_window"],
            always: ["desktop_window"],
            metadata: { window: params.window },
          })

          try {
            const output = yield* Effect.promise(() => handleWindowAction(params.window as any))

            return {
              title: `Window: ${params.window.action}`,
              metadata: { action: params.window.action },
              output,
            }
          } catch (error) {
            return {
              title: "Window error",
              metadata: {},
              output: `Failed: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        }),
    }
  }),
)
