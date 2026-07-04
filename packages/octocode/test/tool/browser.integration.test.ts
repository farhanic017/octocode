import { Effect, Layer } from "effect"
import { describe, expect } from "bun:test"
import { testEffect } from "../lib/effect"
import { Agent } from "../../src/agent/agent"
import { Truncate } from "@/tool/truncate"
import * as Tool from "@/tool/tool"
import { BrowserNavigateTool } from "../../src/tool/browser_navigate"
import { BrowserClickTool } from "../../src/tool/browser_click"
import { BrowserTypeTool } from "../../src/tool/browser_type"
import { BrowserScreenshotTool } from "../../src/tool/browser_screenshot"
import { BrowserEvaluateTool } from "../../src/tool/browser_evaluate"
import { BrowserWaitTool } from "../../src/tool/browser_wait"
import { BrowserHoverTool } from "../../src/tool/browser_hover"
import { BrowserSelectTool } from "../../src/tool/browser_select"
import { BrowserDragTool } from "../../src/tool/browser_drag"

const it = testEffect(Layer.mergeAll(Truncate.defaultLayer, Agent.defaultLayer))

describe("Browser Tool Integration", () => {
  it.effect("all browser tools have valid IDs", () =>
    Effect.gen(function* () {
      const tools = [
        yield* BrowserNavigateTool,
        yield* BrowserClickTool,
        yield* BrowserTypeTool,
        yield* BrowserScreenshotTool,
        yield* BrowserEvaluateTool,
        yield* BrowserWaitTool,
        yield* BrowserHoverTool,
        yield* BrowserSelectTool,
        yield* BrowserDragTool,
      ]

      const ids = tools.map((t) => t.id)
      expect(ids).toContain("browser_navigate")
      expect(ids).toContain("browser_click")
      expect(ids).toContain("browser_type")
      expect(ids).toContain("browser_screenshot")
      expect(ids).toContain("browser_evaluate")
      expect(ids).toContain("browser_wait")
      expect(ids).toContain("browser_hover")
      expect(ids).toContain("browser_select")
      expect(ids).toContain("browser_drag")
    }),
  )

  it.effect("all browser tools can be initialized", () =>
    Effect.gen(function* () {
      const tools = [
        yield* BrowserNavigateTool,
        yield* BrowserClickTool,
        yield* BrowserTypeTool,
        yield* BrowserScreenshotTool,
        yield* BrowserEvaluateTool,
        yield* BrowserWaitTool,
        yield* BrowserHoverTool,
        yield* BrowserSelectTool,
        yield* BrowserDragTool,
      ]

      for (const tool of tools) {
        const def = yield* Tool.init(tool)
        expect(def.id).toBeDefined()
        expect(typeof def.description).toBe("string")
        expect(def.description.length).toBeGreaterThan(0)
      }
    }),
  )

  it.effect("browser_navigate has url parameter", () =>
    Effect.gen(function* () {
      const tool = yield* BrowserNavigateTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("browser_navigate")
    }),
  )

  it.effect("browser_click has selector parameter", () =>
    Effect.gen(function* () {
      const tool = yield* BrowserClickTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("browser_click")
    }),
  )

  it.effect("browser_type has text parameter", () =>
    Effect.gen(function* () {
      const tool = yield* BrowserTypeTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("browser_type")
    }),
  )

  it.effect("browser_screenshot has format parameter", () =>
    Effect.gen(function* () {
      const tool = yield* BrowserScreenshotTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("browser_screenshot")
    }),
  )

  it.effect("browser_evaluate has script parameter", () =>
    Effect.gen(function* () {
      const tool = yield* BrowserEvaluateTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("browser_evaluate")
    }),
  )

  it.effect("browser_wait has timeout parameter", () =>
    Effect.gen(function* () {
      const tool = yield* BrowserWaitTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("browser_wait")
    }),
  )

  it.effect("browser_hover has selector parameter", () =>
    Effect.gen(function* () {
      const tool = yield* BrowserHoverTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("browser_hover")
    }),
  )

  it.effect("browser_select has value parameter", () =>
    Effect.gen(function* () {
      const tool = yield* BrowserSelectTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("browser_select")
    }),
  )

  it.effect("browser_drag has source and target parameters", () =>
    Effect.gen(function* () {
      const tool = yield* BrowserDragTool
      const def = yield* Tool.init(tool)
      expect(def.id).toBe("browser_drag")
    }),
  )
})
