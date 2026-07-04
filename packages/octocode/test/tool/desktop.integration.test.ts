import { Effect, Layer } from "effect"
import { describe, expect, test } from "bun:test"
import { testEffect } from "../lib/effect"
import { Agent } from "../../src/agent/agent"
import { Truncate } from "@/tool/truncate"
import * as Tool from "@/tool/tool"
import { DesktopControlTool } from "../../src/tool/desktop_control"
import { ScreenshotTool } from "../../src/tool/screenshot"
import { OpenAppTool } from "../../src/tool/open_app"
import { OpenTerminalTool } from "../../src/tool/open_terminal"
import { DesktopClipboardTool } from "../../src/tool/desktop_clipboard"
import { DesktopWindowTool } from "../../src/tool/desktop_window"
import { DesktopWorkflowTool } from "../../src/tool/desktop_workflow"
import { VisualQATool } from "../../src/tool/visual_qa"

const it = testEffect(Layer.mergeAll(Truncate.defaultLayer, Agent.defaultLayer))

describe("Desktop Tool Integration", () => {
  it.effect("all desktop tools have valid IDs", () =>
    Effect.gen(function* () {
      const tools = [
        yield* DesktopControlTool,
        yield* ScreenshotTool,
        yield* OpenAppTool,
        yield* OpenTerminalTool,
        yield* DesktopClipboardTool,
        yield* DesktopWindowTool,
        yield* DesktopWorkflowTool,
        yield* VisualQATool,
      ]

      const ids = tools.map((t) => t.id)
      expect(ids).toContain("desktop_control")
      expect(ids).toContain("screenshot")
      expect(ids).toContain("open_app")
      expect(ids).toContain("open_terminal")
      expect(ids).toContain("desktop_clipboard")
      expect(ids).toContain("desktop_window")
      expect(ids).toContain("desktop_workflow")
      expect(ids).toContain("visual_qa")
    }),
  )

  it.effect("all desktop tools can be initialized", () =>
    Effect.gen(function* () {
      const tools = [
        yield* DesktopControlTool,
        yield* ScreenshotTool,
        yield* OpenAppTool,
        yield* OpenTerminalTool,
        yield* DesktopClipboardTool,
        yield* DesktopWindowTool,
        yield* DesktopWorkflowTool,
        yield* VisualQATool,
      ]

      for (const tool of tools) {
        const def = yield* Tool.init(tool)
        expect(def.id).toBeDefined()
        expect(typeof def.description).toBe("string")
        expect(def.description.length).toBeGreaterThan(0)
      }
    }),
  )

  it.effect("desktop_control has click action schema", () =>
    Effect.gen(function* () {
      const tool = yield* DesktopControlTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("desktop_control")
    }),
  )

  it.effect("screenshot has region parameter", () =>
    Effect.gen(function* () {
      const tool = yield* ScreenshotTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("screenshot")
    }),
  )

  it.effect("open_app has app parameter", () =>
    Effect.gen(function* () {
      const tool = yield* OpenAppTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("open_app")
    }),
  )

  it.effect("open_terminal has shell parameter", () =>
    Effect.gen(function* () {
      const tool = yield* OpenTerminalTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("open_terminal")
    }),
  )

  it.effect("desktop_clipboard has action parameter", () =>
    Effect.gen(function* () {
      const tool = yield* DesktopClipboardTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("desktop_clipboard")
    }),
  )

  it.effect("desktop_window has action parameter", () =>
    Effect.gen(function* () {
      const tool = yield* DesktopWindowTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("desktop_window")
    }),
  )

  it.effect("desktop_workflow has action parameter", () =>
    Effect.gen(function* () {
      const tool = yield* DesktopWorkflowTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("desktop_workflow")
    }),
  )

  it.effect("visual_qa has action parameter", () =>
    Effect.gen(function* () {
      const tool = yield* VisualQATool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("visual_qa")
    }),
  )
})
